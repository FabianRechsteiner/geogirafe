import { v4 as uuidv4 } from 'uuid';
import GirafeSingleton from '../base/GirafeSingleton';
import Basemap from '../models/basemap';
import Layer from '../models/layers/layer';
import Theme from '../models/theme';
import { GMFBackgroundLayer, GMFTheme, GMFTreeItem } from '../models/gmf';
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

    this.stateManager.subscribe('selectedTheme', (_oldTheme: Theme | null, newTheme: Theme | null) =>
      this.onChangeTheme(newTheme)
    );

    this.initialize();
  }

  private async initialize() {
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
    const response = await fetch(this.configManager.Config.themes.url);
    const content = await response.json();
    this.state.ogcServers = content['ogcServers'];
    if (this.configManager.Config.basemaps.show) {
      this.state.basemaps = this.prepareBasemaps(content['background_layers']);
    }
    this.state.themes = this.prepareThemes(content['themes']);

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
    const themes: { [key: number]: Theme } = {};
    const order = { value: 0 };
    themesJson.forEach((themeJson: GMFTheme, index: number) => {
      if (!themeJson.icon.startsWith('http') && this.configManager.Config.themes.imagesUrlPrefix) {
        themeJson.icon = this.configManager.Config.themes.imagesUrlPrefix + themeJson.icon;
      }
      const theme = new Theme(themeJson);
      themeJson.children.forEach((layerJson: GMFTreeItem) => {
        const layer = this.prepareThemeLayer(layerJson, null, order);
        if (layer) {
          theme._layersTree.push(layer);
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

  onChangeTheme(theme: Theme | null) {
    // Deactivate all active layers
    for (const element of this.state.layers.layersList) {
      element.activeState = 'off';
    }

    // Add the current theme
    const layersList: Layer[] = [];
    if (theme) {
      theme._layersTree.forEach((layer) => {
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
    for (const theme of Object.values(this.state.themes)) {
      const layer = this.#findLayerRecursive(theme._layersTree, layername);
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
