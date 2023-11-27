import GirafeSingleton from '../base/GirafeSingleton';
import Basemap from '../models/basemap';
import Layer from '../models/layers/layer';
import Theme from '../models/theme';
import { GMFBackgroundLayer, GMFTheme, GMFTreeItem } from '../models/gmf';
import ConfigManager from './configmanager';
import StateManager from './state/statemanager';
import GroupLayer from '../models/layers/layergroup';
import BaseLayer from '../models/layers/baselayer';
import LayerOsm from '../models/layers/layerosm';
import LayerVectorTiles from '../models/layers/layervectortiles';
import LayerWmts from '../models/layers/layerwmts';
import LayerWms from '../models/layers/layerwms';
import LayerManager from './layermanager';

class ThemesManager extends GirafeSingleton {
  configManager: ConfigManager;
  stateManager: StateManager;
  layerManager: LayerManager;

  get state() {
    return this.stateManager.state;
  }

  constructor(type: string) {
    super(type);

    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();
    this.layerManager = LayerManager.getInstance();

    this.configManager
      .loadConfig()
      .then(() => {
        this.loadThemes();
      })
      .then(() => {
        console.log('Themes were loaded');
      });

    this.stateManager.subscribe('selectedTheme', (_oldTheme: Theme | null, newTheme: Theme | null) =>
      this.onChangeTheme(newTheme)
    );
  }

  /**
   * Load themes from backend and configures background layers if needed
   */
  async loadThemes() {
    const response = await fetch(this.configManager.Config.themes.url);
    const content = await response.json();
    this.state.ogcServers = content['ogcServers'];
    if (this.configManager.Config.basemaps.show) {
      this.state.basemaps = this.prepareBasemaps(content['background_layers']);
    }
    this.state.themes = this.prepareThemes(content['themes']);

    this.setDefaultTheme();
  }

  setDefaultTheme() {
    // Set default theme if any
    if (!this.isNullOrUndefinedOrBlank(this.configManager.Config.themes.defaultTheme)) {
      const themes = Object.values(this.state.themes);
      const defaultTheme = themes.find((t) => t.name === this.configManager.Config.themes.defaultTheme);
      if (defaultTheme) {
        this.state.selectedTheme = defaultTheme;
      } else {
        // The default theme was not found
        console.warn(`The default theme ${this.configManager.Config.themes.defaultTheme} could not be found.`);
      }
    }
  }

  prepareBasemaps(basemapJson: GMFBackgroundLayer[]) {
    const basemaps: { [key: number]: Basemap } = {};

    if (this.configManager.Config.basemaps.OSM) {
      // Add default OSM Option
      const osmBasemap = new Basemap({ id: -1, name: 'OpenStreetMap' });
      basemaps[osmBasemap.id] = osmBasemap;
      const data: GMFTreeItem = {
        id: -1,
        name: 'OpenStreetMap',
        type: 'OSM',
        metadata: {
          isLegendExpanded: false,
          wasLegendExpanded: false,
          exclusiveGroup: false,
          isExpanded: false,
          isChecked: false
        }
      };
      osmBasemap.layersList.push(new LayerOsm(data, 0));
    }

    if (this.configManager.Config.basemaps.SwissTopoVectorTiles) {
      // Add default Vector Tiles
      const vectorBasemap = new Basemap({ id: -2, name: 'Vector-Tiles' });
      basemaps[vectorBasemap.id] = vectorBasemap;
      const data: GMFTreeItem = {
        id: -2,
        name: 'Vector-Tiles',
        type: 'VectorTiles',
        style: 'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.leichte-basiskarte.vt/style.json',
        source: 'leichtebasiskarte_v3.0.1',
        projection: 'EPSG:3857',
        metadata: {
          isLegendExpanded: false,
          wasLegendExpanded: false,
          exclusiveGroup: false,
          isExpanded: false,
          isChecked: false
        }
      };
      vectorBasemap.layersList.push(new LayerVectorTiles(data, 0));
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
          basemap.layersList.push(this.prepareThemeLayer(child, null, order));
        });
      } else {
        // Only one layer in this basemap
        basemap.layersList.push(this.prepareThemeLayer(elem, null, order));
      }
    });

    return basemaps;
  }

  prepareThemes(themesJson: GMFTheme[]) {
    const themes: { [key: number]: Theme } = {};
    const order = { value: 0 };
    themesJson.forEach((themeJson: GMFTheme, index: number) => {
      if (!themeJson.icon.startsWith('http') && this.configManager.Config.themes.imagesUrlPrefix) {
        themeJson.icon = this.configManager.Config.themes.imagesUrlPrefix + themeJson.icon;
      }
      const theme = new Theme(themeJson);
      themeJson.children.forEach((layerJson: GMFTreeItem) => {
        const layer = this.prepareThemeLayer(layerJson, null, order);
        theme.layersTree.push(layer);
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
    let layer: BaseLayer;
    switch (elem.type) {
      case 'OSM': {
        layer = new LayerOsm(elem, order.value);
        break;
      }

      case 'VectorTiles': {
        layer = new LayerVectorTiles(elem, order.value);
        break;
      }

      case 'WMTS': {
        layer = new LayerWmts(elem, order.value);
        break;
      }

      case 'WMS': {
        if (ogcServerName) {
          const ogcServer = this.state.ogcServers[ogcServerName];
          const urlWfs = ogcServer.wfsSupport ? ogcServer.urlWfs : null;
          layer = new LayerWms(elem, ogcServerName, ogcServer.url, urlWfs, order.value);
        } else {
          layer = new Layer(elem, order.value);
          this.layerManager.setError(
            layer,
            `No OGC-Server was found for layer ${elem.name}, please verify the backend configuration.`
          );
        }
        break;
      }

      default: {
        // Group
        const group = new GroupLayer(elem, order.value);

        // Append childs
        if (elem.children) {
          elem.children.forEach((child: GMFTreeItem) => {
            const childLayer = this.prepareThemeLayer(child, ogcServerName, order);
            childLayer.parent = group;
            group.children.push(childLayer);
          });
        }
        layer = group;
      }
    }

    order.value = order.value + 1;
    return layer;
  }

  onChangeTheme(theme: Theme | null) {
    // Deactivate all active layers
    for (const element of this.state.layers.layersList) {
      element.activeState = 'off';
    }

    // Add the current theme
    const layersList: Layer[] = [];
    if (theme) {
      theme.layersTree.forEach((layer) => {
        this.addLayerToLoadedList(layersList, layer);
      });
    }

    // Update state only once at the end of the process to prevent 1000 of events to be sent
    this.state.layers.layersList = layersList;
  }

  addLayerToLoadedList(layersList: BaseLayer[], layer: BaseLayer) {
    layersList.push(layer);
    if (layer instanceof GroupLayer) {
      layer.children.forEach((child) => {
        this.addLayerToLoadedList(layersList, child);
      });
    }
  }
}

export default ThemesManager;
