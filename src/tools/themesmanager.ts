import { v4 as uuidv4 } from 'uuid';
import GirafeSingleton from '../base/GirafeSingleton';
import Basemap from '../models/basemap';
import Layer from '../models/layers/layer';
import { GMFBackgroundLayer, GMFServerOgc, GMFTheme, GMFTreeItem } from '../models/gmf';
import ConfigManager from './configuration/configmanager';
import StateManager from './state/statemanager';
import GroupLayer from '../models/layers/grouplayer';
import BaseLayer from '../models/layers/baselayer';
import LayerOsm from '../models/layers/layerosm';
import LayerVectorTiles from '../models/layers/layervectortiles';
import LayerWmts from '../models/layers/layerwmts';
import LayerWms from '../models/layers/layerwms';
import LayerManager from './layermanager';
import ShareManager from './share/sharemanager';
import LayerConsts from '../models/layers/layerconsts';
import LayerCog from '../models/layers/layercog';
import LayerXYZ from '../models/layers/layerxyz';
import ServerOgc from '../models/serverogc';
import ThemeLayer from '../models/layers/themelayer';
import WfsManager from './wfs/wfsmanager';
import AuthHelper from './auth/authhelper';

class ThemesManager extends GirafeSingleton {
  configManager: ConfigManager;
  stateManager: StateManager;
  layerManager: LayerManager;
  shareManager: ShareManager;

  get state() {
    return this.stateManager.state;
  }

  constructor(type: string) {
    super(type);

    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();
    this.layerManager = LayerManager.getInstance();
    this.shareManager = ShareManager.getInstance();

    this.stateManager.subscribe(
      'themes.lastSelectedTheme',
      (_oldTheme: ThemeLayer | null, newTheme: ThemeLayer | null) => this.onChangeTheme(newTheme)
    );

    this.stateManager.subscribe('oauth.userInfo', () => this.loadThemes());
  }

  public async initialize() {
    await this.configManager.loadConfig();
    await this.loadThemes();

    console.log('Themes were loaded');

    // We shouldn't set the default theme is there is any configured hash
    if (this.shareManager.hasSharedState()) {
      this.shareManager.setStateFromUrl();
    } else {
      this.setDefaultTheme();
    }
  }

  /**
   * Load themes from backend and configures background layers if needed
   */
  async loadThemes() {
    const response = await fetch(this.configManager.Config.themes.url, AuthHelper.getFetchOptions());

    const content = await response.json();
    this.state.ogcServers = this.prepareOgcServers(content['ogcServers']);
    if (this.configManager.Config.basemaps.show) {
      this.state.basemaps = this.prepareBasemaps(content['background_layers']);
    }
    this.state.themes._allThemes = this.prepareThemes(content['themes']);
    this.state.themes.isLoaded = true;

    if (this.configManager.Config.themes.showErrorsOnStart) {
      // Display themes errors only if configured so.
      // Parse errors if any
      for (const error of content['errors']) {
        this.state.infobox.elements.push({
          id: uuidv4(),
          text: error,
          type: 'error'
        });
      }
    }
  }

  setDefaultTheme() {
    // Set default theme if any
    if (!this.isNullOrUndefinedOrBlank(this.configManager.Config.themes.defaultTheme)) {
      const themes = Object.values(this.state.themes._allThemes);
      const defaultTheme = themes.find((t) => t.name === this.configManager.Config.themes.defaultTheme);
      if (defaultTheme) {
        this.state.themes.lastSelectedTheme = defaultTheme;
      } else {
        // The default theme was not found
        console.warn(`The default theme ${this.configManager.Config.themes.defaultTheme} could not be found.`);
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

  prepareBasemaps(basemapJson: GMFBackgroundLayer[]) {
    const basemaps: { [key: number]: Basemap } = {};

    if (this.configManager.Config.basemaps.emptyBasemap) {
      // Add an empty basemap
      const emptyBasemap = new Basemap({ id: 0, name: 'Empty' });
      basemaps[emptyBasemap.id] = emptyBasemap;
    }

    if (this.configManager.Config.basemaps.OSM) {
      // Add default OSM Option
      const osmBasemap = new Basemap({ id: -1, name: 'OpenStreetMap' });
      basemaps[osmBasemap.id] = osmBasemap;
      osmBasemap.layersList.push(new LayerOsm(0));
    }

    if (this.configManager.Config.basemaps.SwissTopoVectorTiles) {
      // Add default Vector Tiles
      const vectorBasemap = new Basemap({ id: -2, name: 'Vector-Tiles' });
      basemaps[vectorBasemap.id] = vectorBasemap;
      const vectorTilesLayer = new LayerVectorTiles(
        LayerConsts.LayerSwisstopoVectorTilesId,
        'Vector-Tiles',
        0,
        'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.leichte-basiskarte.vt/style.json',
        'leichtebasiskarte_v3.0.1',
        { projection: 'EPSG:3857' }
      );
      vectorBasemap.layersList.push(vectorTilesLayer);
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
      const theme = new ThemeLayer(themeJson['id'], themeJson['name'], index, themeJson['icon']);
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
          this.state.infobox.elements.push({
            id: uuidv4(),
            text: `Layer ${elem.name} (id=${elem.id}) is invalid and cannot be created: missing OGC-Server.`,
            type: 'error'
          });
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
          isExclusiveGroup: elem.metadata?.exclusiveGroup
        };
        const group = new GroupLayer(elem.id, elem.name, order.value, options);

        // Append childs
        if (elem.children) {
          elem.children.forEach((child: GMFTreeItem) => {
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

  onChangeTheme(theme: ThemeLayer | null) {
    if (!theme) {
      // Theme is null, nothing to do here
      return;
    }

    // Create a clone of the theme object to use it in the treeview.
    // This is essential, otherwise all changes done in the layers
    // (For exemple when expanding legend, expanding a group, or activating the layer)
    // Will also be done in the default layer configuration that has been loaded from themes.json
    // And when a theme will be selected agin from the themes-selector
    // The default configuration will have been overriden.
    const clonedTheme = theme.clone();

    if (this.configManager.Config.themes.selectionMode === 'replace') {
      // Mode is <replace>
      // 1. Deactivate all active layers
      for (const element of this.state.layers.layersList) {
        element.activeState = 'off';
      }
      // 2. Add new layers
      this.state.layers.layersList = clonedTheme.children;
    } else if (!this.state.layers.layersList.find((l) => l.id == clonedTheme.id)) {
      // Mode is <add>
      // Add new theme to the list if is not in the list yet
      // Set order to 0, because the theme should be added at the top of the list
      clonedTheme.order = 0;
      this.state.layers.layersList.push(clonedTheme);
    } else {
      console.info(`The theme ${clonedTheme.name} is already present in the treeview.`);
    }
  }

  findThemeByName(themename: string): ThemeLayer {
    for (const theme of Object.values(this.state.themes._allThemes)) {
      if (theme.name === themename) {
        return theme;
      }
    }

    throw new Error(`Theme ${themename} was not found`);
  }

  findGroupByName(groupname: string): GroupLayer {
    const group = this.#findBaseLayerByName(groupname);
    if (group instanceof GroupLayer) {
      return group;
    }

    throw new Error(`Layer ${group.name} was found, but is not a group`);
  }

  findLayerByName(layername: string): Layer {
    const layer = this.#findBaseLayerByName(layername);
    if (layer instanceof Layer) {
      return layer;
    }

    throw new Error(`Layer ${layer.name} was found, but is not a layer`);
  }

  #findBaseLayerByName(layername: string): BaseLayer {
    for (const theme of Object.values(this.state.themes._allThemes)) {
      const layer = this.#findLayerRecursive(theme.children, layername);
      if (layer) {
        return layer;
      }
    }
    throw new Error(`Layer ${layername} not found !`);
  }

  #findLayerRecursive(layers: BaseLayer[], layername: string): BaseLayer | null {
    for (const layer of layers) {
      if (layer.name === layername) {
        return layer;
      }
      if (layer instanceof GroupLayer) {
        const child = this.#findLayerRecursive(layer.children, layername);
        if (child) {
          return child;
        }
      }
    }

    return null;
  }
}

export default ThemesManager;
