import GirafeSingleton from "../base/GirafeSingleton";
import Basemap from "../models/basemap";
import Layer from "../models/layer";
import Theme from "../models/theme";
import { GMFBackgroundLayer, GMFTheme, GMFTreeItem} from "../models/gmf";
import ConfigManager from "./configmanager";
import StateManager from "./state/statemanager";

class ThemesManager extends GirafeSingleton {

  configManager: ConfigManager;
  stateManager: StateManager;

  get state() {
    return this.stateManager.state;
  }

  constructor(type: string) {
    super(type);

    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();

    this.configManager.loadConfig()
      .then(() => { this.loadThemes(); })
      .then(() => { console.log('Themes were loaded'); });

    this.stateManager.subscribe('selectedTheme', (_oldTheme: Theme, newTheme: Theme) => this.onChangeTheme(newTheme));
  }

  /**
   * Load themes from backend and configures background layers if needed
   */
  async loadThemes() {
    const response = await fetch(this.configManager.Config.themes.url);
    const content = await response.json();
    this.state.ogcServers = content["ogcServers"];
    if (this.configManager.Config.basemaps.show) {
      this.state.basemaps = this.prepareBasemaps(content["background_layers"]);
    }
    this.state.themes = this.prepareThemes(content["themes"]);

    this.setDefaultTheme();
  }

  setDefaultTheme() {
    // Set default theme if any
    if (!this.isNullOrUndefinedOrBlank(this.configManager.Config.themes.defaultTheme)) {
      const themes = Object.values(this.state.themes) as Theme[];
      const defaultTheme = themes.find((t) => t.name === this.configManager.Config.themes.defaultTheme);
      if (defaultTheme) {
        this.state.selectedTheme = defaultTheme;
      }
      else {
        // The default theme was not found
        console.warn(`The default theme ${this.configManager.Config.themes.defaultTheme} could not be found.`);
      }
    }
  }

  prepareBasemaps(basemapJson: GMFBackgroundLayer[]) {
    const basemaps: { [key: number]: Basemap } = {};

    if (this.configManager.Config.basemaps.OSM) {
      // Add default OSM Option
      const osmBasemap = new Basemap({"id": -1, "name": "OpenStreetMap"});
      basemaps[osmBasemap.id] = osmBasemap;
      const data = {
        "id" : "-1",
        "name" : "OpenStreetMap",
        "type" : "OSM"
      };
      osmBasemap.layersList.push(new Layer(data, null, null, null, 0));
    }

    if (this.configManager.Config.basemaps.SwissTopoVectorTiles) {
      // Add default Vector Tiles
      const vectorBasemap = new Basemap({"id": -2, "name": "Vector-Tiles"});
      basemaps[vectorBasemap.id] = vectorBasemap;
      const data = {
        "id" : "-2",
        "name": "Vector-Tiles",
        "type": "VectorTiles",
        "style": "https://vectortiles.geo.admin.ch/styles/ch.swisstopo.leichte-basiskarte.vt/style.json",
        "projection": "EPSG:3857"
      };
      vectorBasemap.layersList.push(new Layer(data, null, null, null, 0));
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
          basemap.layersList.push(this.createTreeItem(child, null, order));
        });
      }
      else {
        // Only one layer in this basemap
        basemap.layersList.push(this.createTreeItem(elem, null, order));
      }
    });

    return basemaps;
  }

  prepareThemes(themesJson: GMFTheme[]) {
    const themes: { [key: number]: Theme} = {};
    const order = { value: 0 };
    themesJson.forEach((themeJson: GMFTheme, index: number) => {
      if (!themeJson.icon.startsWith('http') && !this.configManager.Config.themes.imagesUrlPrefix) {
        themeJson.icon = this.configManager.Config.themes.imagesUrlPrefix + themeJson.icon;
      }
      const theme = new Theme(themeJson);
      themeJson.children.forEach((layerJson: GMFTreeItem) => {
        const layer = this.createTreeItem(layerJson, null, order);
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
  createTreeItem(elem: GMFTreeItem, parentServer: string | null, order: {value: number}) {
    // If a server is defined on this node, we use it.
    // Otherwise, we use the server of the parent
    const ogcServer = (elem.ogcServer) ? elem.ogcServer : parentServer;

    // Create Layer
    const layer = this.createLayer(elem, ogcServer, order.value);
    order.value = order.value + 1;

    // Append childs if any
    if (elem.children) {
      elem.children.forEach((child: GMFTreeItem) => {
        const childLayer = this.createTreeItem(child, ogcServer, order);
        childLayer.parent = layer;
        layer.children.push(childLayer);
      });
    }

    return layer;
  }

  /**
   * Creates the WMS or WMTS Layer
   * @param elem the layer info with its type defining if WMS or WMTS
   * @param ocgServerName an optional ogc server name
   * @param order the order in the layertree
   * @returns a girafe Layer
   */
  createLayer(elem: GMFTreeItem, ocgServerName: string | null, order: number): Layer {
    let url = null;
    let urlWfs = null;
    if (elem.type === 'WMS') {
      // WMS Case: there must be an OGC-Server
      if (ocgServerName) {
        const ogcServer = this.state.ogcServers[ocgServerName];
        url = ogcServer.url;
        if (ogcServer.wfsSupport === true) {
          urlWfs = ogcServer.urlWfs;
        }
      }
      else {
        console.log('No OGC server found for layer ' + elem.name);
      }
    }
    else if (elem.type === 'WMTS') {
      // WMTS Case: we take the URL of Capabilities
      if (!elem.url) {
        throw new Error("No URL defined for WMTS layer " + elem.name);
      }
      url = elem.url;
    }
    else {
      console.log('Unmanaged layer type: ' + elem.type);
    }

    const layer = new Layer(elem, ocgServerName, url, urlWfs, order);
    return layer;
  }

  onChangeTheme(theme: Theme) {
    // Deactivate all active layers
    for (let i=0; i<this.state.layers.layersList.length; ++i) {
      this.state.layers.layersList[i].activeState = 'off';
    }

    // Add the current theme
    const layersList: Layer[] = [];
    theme.layersTree.forEach(layer => {
      this.addLayerToLoadedList(layersList, layer);
    });

    // Update state only once at the end of the process to prevent 1000 of events to be sent
    this.state.layers.layersList = layersList;
  }

  addLayerToLoadedList(layersList: Layer[], layer: Layer) {
    layersList.push(layer);
    layer.children.forEach(child => {
      this.addLayerToLoadedList(layersList, child);
    });
  }
}

export default ThemesManager
