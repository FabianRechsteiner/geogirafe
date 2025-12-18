import { v4 as uuidv4 } from 'uuid';
import GirafeSingleton from '../../base/GirafeSingleton';
import Basemap from '../../models/basemaps/basemap';
import { GMFBackgroundLayer, GMFServerOgc, GMFTheme, GMFTreeItem } from '../../models/gmf';
import GroupLayer from '../../models/layers/grouplayer';
import BaseLayer from '../../models/layers/baselayer';
import LayerOsm from '../../models/layers/layerosm';
import LayerVectorTiles from '../../models/layers/layervectortiles';
import LayerWmts from '../../models/layers/layerwmts';
import LayerWms from '../../models/layers/layerwms';
import LayerCog from '../../models/layers/layercog';
import LayerXYZ from '../../models/layers/layerxyz';
import ServerOgc from '../../models/serverogc';
import ThemeLayer from '../../models/layers/themelayer';
import BasemapEmpty from '../../models/basemaps/basemapempty';
import BasemapSwisstopoVectorTiles from '../../models/basemaps/basemapswisstopovectortiles';
import BasemapOsm from '../../models/basemaps/basemaposm';
import { DEFAULT_OPACITY, OPACITY_FOR_DEFAULT_BASEMAP } from './themes-config';
import Layer from '../../models/layers/layer';

class ThemesManager extends GirafeSingleton {
  public anonymousUserInfo = { u: 'anonymous' };

  private get state() {
    return this.context.stateManager.state;
  }

  public override initializeSingleton() {
    // We have to wait the authentication to be able to load the themes with the right user-rights
    this.context.stateManager.subscribe('application.isAuthInitialized', async () => {
      if (this.state.application.isAuthInitialized) {
        await this.initialize();
      }
    });

    // This is for the next change in the oAuth status.
    this.context.stateManager.subscribe('oauth.status', async () => {
      if (
        this.state.themes.isLoaded &&
        ((this.state.oauth.somethingChanged && this.state.oauth.status === 'loggedIn') ||
          this.state.oauth.status === 'loggedOut')
      ) {
        await this.initialize();
      }
    });
  }

  private async initialize() {
    try {
      await this.loadThemes();
      console.log('Themes were loaded');

      const stateRestored = await this.restoreState();
      const themeAddedFromUrl = this.context.themesHelper.addThemesFromUrl();
      const groupAddedFromUrl = this.context.themesHelper.addGroupsFromUrl();
      const layersAddedFromUrl = this.context.themesHelper.addLayersFromUrl();
      const basemapAddedFromUrl = this.addBasemapFromUrl();

      if (!stateRestored && !themeAddedFromUrl && !groupAddedFromUrl && !layersAddedFromUrl) {
        this.setDefaultTheme();
      }
      if (!stateRestored && !basemapAddedFromUrl) {
        this.setDefaultBasemap();
      }

      this.context.stateManager.state.application.isStateInitialized = true;
      this.context.sessionManager.beginSession();
    } catch (error) {
      // Themes could not be loaded
      console.error(error);
      await window.gAlert(
        'An error occurred while loading the themes. This has nothing to do with GeoGirafe and is very probably a backend-configuration error (wrong content in themes.json, or CORS error). Please check the backend configuration.',
        'Backend error'
      );
      await window.gAlert('This instance of GeoGirafe cannot be used at the moment.', 'Backend error');
      console.error(error);
    }
  }

  private async restoreState(): Promise<boolean> {
    // try to restore state if any
    let stateRestored = false;
    if (this.context.shareManager.hasSharedState()) {
      stateRestored = await this.context.shareManager.setStateFromUrl();
    } else if (this.context.sessionManager.hasState()) {
      stateRestored = this.context.sessionManager.setStateFromSession();
    }
    return stateRestored;
  }

  private addBasemapFromUrl(): boolean {
    if (this.context.permalinkManager.hasBasemap()) {
      const bs = this.context.permalinkManager.getBasemap();
      for (const basemap of Object.values(this.state.basemaps)) {
        if (basemap.name === bs) {
          this.state.activeBasemaps = [basemap];
          return true;
        }
      }

      // Nothing found
      console.warn(`Basemap ${bs} cannot be found`);
    }
    return false;
  }
  /**
   * Load themes from backend and configures background layers if needed
   */
  private async loadThemes() {
    this.state.themes.isLoaded = false;
    const response = await fetch(this.context.configManager.Config.themes.url);

    const content = await response.json();
    this.state.ogcServers = this.prepareOgcServers(content['ogcServers']);
    this.state.basemaps = this.prepareBasemaps(content['background_layers']);
    this.state.themes._allThemes = this.prepareThemes(content['themes']);
    this.context.customThemesManager.loadCustomThemes();
    this.state.themes.isLoaded = true;

    if (this.context.configManager.Config.themes.showErrorsOnStart) {
      // Display themes errors only if configured so.
      // Parse errors if any
      for (const error of content['errors']) {
        this.context.errorManager.pushMessage(uuidv4(), error, 'error');
      }
    }
  }

  private setDefaultTheme() {
    // Set default theme if any
    if (!this.isNullOrUndefinedOrBlank(this.context.configManager.Config.themes.defaultTheme)) {
      const themes = [
        ...Object.values(this.state.themes._allThemes),
        ...Object.values(this.context.customThemesManager.customThemes)
      ];
      const defaultTheme = themes.find((t) => t.name === this.context.configManager.Config.themes.defaultTheme);
      if (defaultTheme) {
        this.state.themes.lastSelectedTheme = defaultTheme;
      } else {
        // The default theme was not found
        console.warn(`The default theme ${this.context.configManager.Config.themes.defaultTheme} could not be found.`);
      }
    }
  }

  private setDefaultBasemap() {
    for (const basemap of Object.values(this.state.basemaps)) {
      if (basemap.name === this.context.configManager.Config.basemaps.defaultBasemap) {
        this.state.activeBasemaps = [basemap];
        break;
      }
    }
  }

  private prepareOgcServers(ogcServerJson: Record<string, GMFServerOgc>) {
    const servers: { [key: string]: ServerOgc } = {};
    if (ogcServerJson) {
      for (const serverName of Object.keys(ogcServerJson)) {
        const server = new ServerOgc(serverName, ogcServerJson[serverName]);
        servers[serverName] = server;
      }

      // Preload WFS FeatureInfos
      this.preloadWfsServer(servers);
    }
    return servers;
  }

  /**
   * Preload all WFS DescribeFeatureType
   * In order to limit the network overload, the servers calls are done sequetially
   * and each call will wait the previous one to be done
   */
  private async preloadWfsServer(ogcServers: { [key: string]: ServerOgc }) {
    for (const server of Object.values(ogcServers)) {
      if (server.wfsSupport) {
        await this.context.wfsManager.getServerWfs(server);
      }
    }
  }

  private prepareBasemaps(basemapJson: GMFBackgroundLayer[]) {
    const basemaps: { [key: number]: Basemap } = {};

    if (this.context.configManager.Config.basemaps.emptyBasemap) {
      const basemapEmpty = new BasemapEmpty();
      basemaps[basemapEmpty.id] = basemapEmpty;
    }

    if (this.context.configManager.Config.basemaps.OSM) {
      const basemapOsm = new BasemapOsm();
      basemaps[basemapOsm.id] = basemapOsm;
    }

    if (this.context.configManager.Config.basemaps.SwissTopoVectorTiles) {
      const basemapSwisstopoVectorTiles = new BasemapSwisstopoVectorTiles();
      basemaps[basemapSwisstopoVectorTiles.id] = basemapSwisstopoVectorTiles;
    }

    basemapJson.forEach((elem: GMFBackgroundLayer) => {
      // Create basemap
      const basemap = new Basemap(elem);
      basemaps[basemap.id] = basemap;

      // List all layers in this basemap
      const order = { value: 0 };
      if (elem.children) {
        // Multiple layers
        elem.children.forEach((child: GMFTreeItem) => {
          const layer = this.prepareThemeLayer(child, null, order);
          if (layer) {
            basemap.layersList.push(layer);
          }
        });
      } else {
        // Only one layer in this basemap
        const layer = this.prepareThemeLayer(elem, null, order);
        if (layer) {
          basemap.layersList.push(layer);
        }
      }
    });

    // Apply Opacity
    for (const basemap of Object.values(basemaps)) {
      if (this.context.configManager.Config.basemaps.opacityBasemaps.includes(basemap.name)) {
        // If it is the default Basemap the Opacity should NOT be 0 as otherwise the User would end up seeing nothing
        const isDefaultBasemap = this.context.configManager.Config.basemaps.defaultBasemap == basemap.name;
        basemap.opacity = isDefaultBasemap ? OPACITY_FOR_DEFAULT_BASEMAP : DEFAULT_OPACITY;
        for (const basemapLayer of basemap.layersList) {
          if (basemapLayer instanceof LayerVectorTiles) {
            // Vector tiles layers are not supported as opacitybasemap, because the tiles cannot reprojected on the fly
            // And displaying a basemap from some SRID with an VT from another SRID won't work
            // So for the moment we do not allow VT configured as opacitybasemaps
            // (But the opposite will still work : a VT basemap with a WMTS opacitybasemap)
          }
          if (basemapLayer instanceof Layer) {
            basemapLayer.opacity = basemap.opacity;
          }
        }
      }
    }

    return basemaps;
  }

  private prepareThemes(themesJson: GMFTheme[]) {
    const themes: { [key: number]: ThemeLayer } = {};
    const order = { value: 0 };
    themesJson.forEach((themeJson: GMFTheme, index: number) => {
      if (!themeJson.icon.startsWith('http') && this.context.configManager.Config.themes.imagesUrlPrefix) {
        themeJson.icon = this.context.configManager.Config.themes.imagesUrlPrefix + themeJson.icon;
      }
      const theme = new ThemeLayer(themeJson['id'], themeJson['name'], index, themeJson['icon'], themeJson['metadata']);
      themeJson.children.forEach((layerJson: GMFTreeItem) => {
        const layer = this.prepareThemeLayer(layerJson, null, order);
        if (layer) {
          layer.parent = theme;
          theme.children.push(layer);
        }
      });
      themes[index] = theme;
    });

    return themes;
  }

  private calculateMetadataUrl(metadataUrl?: string) {
    if (!metadataUrl) {
      return undefined;
    }

    if (!metadataUrl.startsWith('http') && this.context.configManager.Config.metadata.metadataUrlPrefix) {
      return this.context.configManager.Config.metadata.metadataUrlPrefix + metadataUrl;
    }

    return metadataUrl;
  }

  /**
   * Will create layer and child layers if elem passed is a group of layers
   * @param elem either a layer or a group of layers
   * @param parentServer in case children are not mixed layers, the parentServer will apply for all children
   * @param order the order in the layer list
   * @returns the created girafe layer
   */
  private prepareThemeLayer(elem: GMFTreeItem, parentServer: string | null, order: { value: number }) {
    // If a server is defined on this node, we use it.
    // Otherwise, we use the server of the parent
    const ogcServerName = elem.ogcServer ? elem.ogcServer : parentServer;

    // Create Layer
    let layer: BaseLayer | null = null;
    switch (elem.type) {
      case 'OSM': {
        layer = new LayerOsm(order.value);
        break;
      }

      case 'VectorTiles': {
        layer = this.createVectorTilesLayer(elem, order);
        break;
      }

      case 'WMTS': {
        layer = this.createWmtsLayer(elem, order);
        break;
      }

      case 'WMS': {
        layer = this.createWmsLayer(ogcServerName, elem, order);
        break;
      }

      case 'COG': {
        layer = new LayerCog(elem.id, elem.name, order.value, elem.url!, elem);
        break;
      }

      case 'XYZ': {
        layer = new LayerXYZ(elem.id, elem.name, order.value, elem.url!, elem);
        break;
      }

      default: {
        // Group
        layer = this.createGroup(elem, order, ogcServerName);
      }
    }

    order.value = order.value + 1;
    return layer;
  }

  private createGroup(elem: GMFTreeItem, order: { value: number }, ogcServerName: string | null): GroupLayer {
    const options = {
      isDefaultChecked: elem.metadata?.isChecked,
      metadataUrl: elem.metadata?.metadataUrl,
      disclaimer: elem.metadata?.disclaimer,
      isDefaultExpanded: elem.metadata?.isExpanded,
      isExclusiveGroup: elem.metadata?.exclusiveGroup,
      isMixed: elem.mixed,
      time: elem.time
    };
    if (options.metadataUrl) {
      options.metadataUrl = this.calculateMetadataUrl(options.metadataUrl);
    }
    const group = new GroupLayer(elem.id, elem.name, order.value, options);

    // Append children
    if (elem.children) {
      for (const child of elem.children) {
        // Append time options to child
        if (options.time) {
          child.time = { ...options.time };
        }
        const childLayer = this.prepareThemeLayer(child, ogcServerName, order);
        if (childLayer) {
          childLayer.parent = group;
          group.children.push(childLayer);
        }
      }
    }
    return group;
  }

  private createWmsLayer(ogcServerName: string | null, elem: GMFTreeItem, order: { value: number }): LayerWms | null {
    if (ogcServerName) {
      const ogcServer = this.state.ogcServers[ogcServerName];
      const options = elem;
      if (options.metadata?.metadataUrl) {
        options.metadata.metadataUrl = this.calculateMetadataUrl(options.metadata.metadataUrl);
      }
      const wmsLayer = new LayerWms(elem.id, elem.name, order.value, ogcServer, elem);
      // For WMFS queries, the layers attribute will be used. It can be different from the name.
      // But in order to be able to define the translations only once, we use an translation alias here.
      if (wmsLayer.layers) {
        this.context.i18nManager.addTranslationAlias(wmsLayer.name, wmsLayer.layers);
      }
      return wmsLayer;
    } else {
      // Layer is invalid : it does not have any OGC-Server
      this.context.errorManager.pushMessage(
        uuidv4(),
        `Layer ${elem.name} (id=${elem.id}) is invalid and cannot be created: missing OGC-Server.`,
        'error'
      );
    }
    return null;
  }

  private createWmtsLayer(elem: GMFTreeItem, order: { value: number }): LayerWmts {
    const ogcServer = elem.metadata?.ogcServer ? this.state.ogcServers[elem.metadata?.ogcServer] : undefined;
    const options = elem;
    if (options.metadata?.metadataUrl) {
      options.metadata.metadataUrl = this.calculateMetadataUrl(options.metadata.metadataUrl);
    }
    return new LayerWmts(elem.id, elem.name, order.value, elem.url!, elem.layer!, options, ogcServer);
  }

  private createVectorTilesLayer(elem: GMFTreeItem, order: { value: number }): LayerVectorTiles | null {
    if (!elem.style || !elem.metadata?.layerName) {
      // Layer is invalid : it must contain style URL and layername
      this.context.errorManager.pushMessage(
        uuidv4(),
        `VectorTiles-Layer ${elem.name} (id=${elem.id}) is invalid and cannot be created: missing Style Url or layername.`,
        'error'
      );
    } else {
      const options = {
        // TODO REG : At the moment projection is hardcoded to EPSG:3857 because we don't have any other usecase.
        // But the supported EPSG should be configurable in the backend
        projection: 'EPSG:3857',
        isDefaultChecked: elem.metadata?.isChecked,
        disclaimer: elem.metadata?.disclaimer,
        metadata: elem.metadata
      };
      if (options.metadata?.metadataUrl) {
        options.metadata.metadataUrl = this.calculateMetadataUrl(options.metadata.metadataUrl);
      }
      return new LayerVectorTiles(elem.id, elem.name, order.value, elem.style, elem.metadata.layerName, options);
    }
    return null;
  }
}

export default ThemesManager;
