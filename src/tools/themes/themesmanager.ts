import { v4 as uuidv4 } from 'uuid';
import GirafeSingleton from '../../base/GirafeSingleton';
import Basemap from '../../models/basemaps/basemap';
import { GMFBackgroundLayer, GMFServerOgc, GMFTheme, GMFTreeItem } from '../../models/gmf';
import ConfigManager from '../configuration/configmanager';
import StateManager from '../state/statemanager';
import GroupLayer from '../../models/layers/grouplayer';
import BaseLayer from '../../models/layers/baselayer';
import LayerOsm from '../../models/layers/layerosm';
import LayerVectorTiles from '../../models/layers/layervectortiles';
import LayerWmts from '../../models/layers/layerwmts';
import LayerWms from '../../models/layers/layerwms';
import LayerManager from '../layers/layermanager';
import ShareManager from '../share/sharemanager';
import LayerCog from '../../models/layers/layercog';
import LayerXYZ from '../../models/layers/layerxyz';
import ServerOgc from '../../models/serverogc';
import ThemeLayer from '../../models/layers/themelayer';
import WfsManager from '../wfs/wfsmanager';
import CustomThemesManager from './customthemesmanager';
import ErrorManager from '../error/errormanager';
import BasemapEmpty from '../../models/basemaps/basemapempty';
import SessionManager from '../share/sessionmanager';
import BasemapSwisstopoVectorTiles from '../../models/basemaps/basemapswisstopovectortiles';
import BasemapOsm from '../../models/basemaps/basemaposm';

class ThemesManager extends GirafeSingleton {
  configManager: ConfigManager;
  stateManager: StateManager;
  layerManager: LayerManager;
  shareManager: ShareManager;
  sessionManager: SessionManager;
  customThemesManager: CustomThemesManager;

  anonymousUserInfo = { u: 'anonymous' };

  get state() {
    return this.stateManager.state;
  }

  constructor(type: string) {
    super(type);

    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();
    this.layerManager = LayerManager.getInstance();
    this.shareManager = ShareManager.getInstance();
    this.sessionManager = SessionManager.getInstance();
    this.customThemesManager = CustomThemesManager.getInstance();

    // We have to wait the authentication to be able to load the themes with the right user-rights
    this.stateManager.subscribe('application.isAuthInitialized', () => {
      if (this.state.application.isAuthInitialized) {
        this.initialize();
      }
    });
  }

  public async initialize() {
    try {
      await this.configManager.loadConfig();
      await this.loadThemes();
      console.log('Themes were loaded');

      // try to restore state if any
      let stateRestored = false;
      if (this.shareManager.hasSharedState()) {
        stateRestored = await this.shareManager.setStateFromUrl();
      } else if (this.sessionManager.hasState()) {
        stateRestored = this.sessionManager.setStateFromSession();
      }
      // Otherwise, apply default theme
      if (!stateRestored) {
        this.setDefaultTheme();
        this.setDefaultBasemap();
      }

      this.stateManager.state.application.isStateInitialized = true;
      this.sessionManager.beginSession();
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

  /**
   * Load themes from backend and configures background layers if needed
   */
  private async loadThemes() {
    this.state.themes.isLoaded = false;
    const response = await fetch(this.configManager.Config.themes.url);

    const content = await response.json();
    this.state.ogcServers = this.prepareOgcServers(content['ogcServers']);
    this.state.basemaps = this.prepareBasemaps(content['background_layers']);
    this.state.themes._allThemes = this.prepareThemes(content['themes']);
    this.customThemesManager.loadCustomThemes();
    this.state.themes.isLoaded = true;

    if (this.configManager.Config.themes.showErrorsOnStart) {
      // Display themes errors only if configured so.
      // Parse errors if any
      for (const error of content['errors']) {
        ErrorManager.getInstance().pushMessage(uuidv4(), error, 'error');
      }
    }
  }

  private setDefaultTheme() {
    // Set default theme if any
    if (!this.isNullOrUndefinedOrBlank(this.configManager.Config.themes.defaultTheme)) {
      const themes = [
        ...Object.values(this.state.themes._allThemes),
        ...Object.values(this.customThemesManager.customThemes)
      ];
      const defaultTheme = themes.find((t) => t.name === this.configManager.Config.themes.defaultTheme);
      if (defaultTheme) {
        this.state.themes.lastSelectedTheme = defaultTheme;
      } else {
        // The default theme was not found
        console.warn(`The default theme ${this.configManager.Config.themes.defaultTheme} could not be found.`);
      }
    }
  }

  private setDefaultBasemap() {
    for (const basemap of Object.values(this.state.basemaps)) {
      if (basemap.name === this.configManager.Config.basemaps.defaultBasemap) {
        this.state.activeBasemap = basemap;
        break;
      }
    }
  }

  prepareOgcServers(ogcServerJson: Record<string, GMFServerOgc>) {
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
  async preloadWfsServer(ogcServers: { [key: string]: ServerOgc }) {
    for (const server of Object.values(ogcServers)) {
      if (server.wfsSupport) {
        await WfsManager.getInstance().getServerWfs(server);
      }
    }
  }

  private prepareBasemaps(basemapJson: GMFBackgroundLayer[]) {
    const basemaps: { [key: number]: Basemap } = {};

    if (this.configManager.Config.basemaps.emptyBasemap) {
      const basemapEmpty = new BasemapEmpty();
      basemaps[basemapEmpty.id] = basemapEmpty;
    }

    if (this.configManager.Config.basemaps.OSM) {
      const basemapOsm = new BasemapOsm();
      basemaps[basemapOsm.id] = basemapOsm;
    }

    if (this.configManager.Config.basemaps.SwissTopoVectorTiles) {
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

    return basemaps;
  }

  prepareThemes(themesJson: GMFTheme[]) {
    const themes: { [key: number]: ThemeLayer } = {};
    const order = { value: 0 };
    themesJson.forEach((themeJson: GMFTheme, index: number) => {
      if (!themeJson.icon.startsWith('http') && this.configManager.Config.themes.imagesUrlPrefix) {
        themeJson.icon = this.configManager.Config.themes.imagesUrlPrefix + themeJson.icon;
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

  /**
   * Will create layer and child layers if elem passed is a group of layers
   * @param elem either a layer or a group of layers
   * @param parentServer in case children are not mixed layers, the parentServer will apply for all children
   * @param order the order in the layer list
   * @returns the created girafe layer
   */
  prepareThemeLayer(elem: GMFTreeItem, parentServer: string | null, order: { value: number }) {
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
        const options = {
          projection: elem.projection,
          isDefaultChecked: elem.metadata?.isChecked,
          disclaimer: elem.metadata?.disclaimer,
          opacity: 1 // TODO REG : Set default opacity
        };
        layer = new LayerVectorTiles(elem.id, elem.name, order.value, elem.style!, elem.source!, options);
        break;
      }

      case 'WMTS': {
        const ogcServer = elem.metadata?.ogcServer ? this.state.ogcServers[elem.metadata?.ogcServer] : undefined;
        layer = new LayerWmts(elem.id, elem.name, order.value, elem.url!, elem.layer!, elem, ogcServer);
        break;
      }

      case 'WMS': {
        if (ogcServerName) {
          const ogcServer = this.state.ogcServers[ogcServerName];
          layer = new LayerWms(elem.id, elem.name, order.value, ogcServer, elem);
        } else {
          // Layer is invalid : it does not have any OGC-Server
          ErrorManager.getInstance().pushMessage(
            uuidv4(),
            `Layer ${elem.name} (id=${elem.id}) is invalid and cannot be created: missing OGC-Server.`,
            'error'
          );
        }
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
        const options = {
          isDefaultChecked: elem.metadata?.isChecked,
          metadataUrl: elem.metadata?.metadataUrl,
          disclaimer: elem.metadata?.disclaimer,
          isDefaultExpanded: elem.metadata?.isExpanded,
          isExclusiveGroup: elem.metadata?.exclusiveGroup,
          time: elem.time
        };
        const group = new GroupLayer(elem.id, elem.name, order.value, options);

        // Append children
        if (elem.children) {
          elem.children.forEach((child: GMFTreeItem) => {
            // Append time options to child
            if (options.time) {
              child.time = { ...options.time };
            }
            const childLayer = this.prepareThemeLayer(child, ogcServerName, order);
            if (childLayer) {
              childLayer.parent = group;
              group.children.push(childLayer);
            }
          });
        }
        layer = group;
      }
    }

    order.value = order.value + 1;
    return layer;
  }
}

export default ThemesManager;
