import GirafeSingleton from "../base/GirafeSingleton";
import Basemap from "../models/basemap";
import Layer from "../models/layer";
import Theme from "../models/theme";
import ConfigManager from "./configmanager";
import StateManager from "./state/statemanager";

class ThemesManager extends GirafeSingleton {

  configManager = null;
  stateManager = null;

  get state() {
    return this.stateManager.state;
  }

  constructor(type) {
    super(type);

    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();

    this.configManager.loadConfig()
      .then(() => { this.loadThemes(); })
      .then(() => { console.log('Themes were loaded'); });

    this.stateManager.subscribe('selectedTheme', (oldTheme, newTheme) => this.onChangeTheme(newTheme));
  }

  async loadThemes() {
    const response = await fetch(this.configManager.Config.themes.url);
    const content = await response.json();
    this.state.ogcServers = content["ogcServers"];
    this.state.basemaps = this.prepareBasemaps(content["background_layers"]);
    this.state.themes = this.prepareThemes(content["themes"]);

    this.setDefaultTheme();
  }

  setDefaultTheme() {
    // Set default theme if any
    if (!this.isNullOrUndefinedOrBlank(this.configManager.Config.themes.defaultTheme)) {
      const defaultTheme = Object.values(this.state.themes).find(t => t.name === this.configManager.Config.themes.defaultTheme);
      if (!this.isNullOrUndefined(defaultTheme)) {
        this.state.selectedTheme = defaultTheme;
      }
      else {
        // The default theme was not found
        console.warn(`The default theme ${this.configManager.Config.themes.defaultTheme} could not be found.`);
      }
    }
  }

  prepareBasemaps(basemapJson) {
    const basemaps = {};

    if (this.configManager.Config.basemaps.OSM) {
      // Add default OSM Option
      const osmBasemap = new Basemap({"id": "-1", "name": "OpenStreetMap"});
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
      const vectorBasemap = new Basemap({"id": "-2", "name": "Vector-Tiles", "projection": "EPSG:3857"});
      basemaps[vectorBasemap.id] = vectorBasemap;
      const data = {
        "id" : "-2",
        "name": "Vector-Tiles",
        "type": "VectorTiles",
        "style": "https://vectortiles.geo.admin.ch/styles/ch.swisstopo.leichte-basiskarte.vt/style.json"
      };
      vectorBasemap.layersList.push(new Layer(data, null, null, null, 0));
    }

    basemapJson.forEach(elem => {
      // Create basemap
      const basemap = new Basemap(elem);
      basemaps[basemap.id] = basemap;

      // List all layers in this basemap
      const order = { value: 0 };
      if (elem.children) {
        // Multiple layers
        elem.children.forEach(child => {
          basemap.layersList.push(this.createLayer(child, null, order));
        });
      }
      else {
        // Only one layer in this basemap
        basemap.layersList.push(this.createLayer(elem, null, order));
      }
    });

    return basemaps;
  }

  prepareThemes(themesJson) {
    const themes = {};
    const order = { value: 0 };
    themesJson.forEach(themeJson => {
      const theme = new Theme(themeJson);
      themeJson.children.forEach(layerJson => {
        const layer = this.createLayer(layerJson, null, order);
        theme.layersTree.push(layer);
      });
      themes[theme.id] = theme;
    });

    return themes;
  }

  createLayer(elem, parentServer, order) {
    // If a server is defined on this node, we use it.
    // Otherwise, we use the server of the parent
    const ogcServer = (elem.ogcServer) ? elem.ogcServer : parentServer;

    // Create Layer
    const layer = this.createLayerObject(elem, ogcServer, order.value);
    order.value = order.value + 1;

    // Append childs if any
    if (elem.children !== undefined) {
      elem.children.forEach(child => {
        const childLayer = this.createLayer(child, ogcServer, order);
        childLayer.parent = layer;
        layer.children.push(childLayer);
      });
    }

    return layer;
  }

  createLayerObject(elem, ocgServerName, order) {
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
      url = elem.url;
    }
    else {
      console.log('Unmanaged layer type: ' + elem.type);
    }

    const layer = new Layer(elem, ocgServerName, url, urlWfs, order);
    return layer;
  }

  onChangeTheme(theme) {
    // Deactivate all active layers
    for (let i=0; i<this.state.layers.layersList.length; ++i) {
      this.state.layers.layersList[i].activeState = 'off';
    }

    // Add the current theme
    const layersList = [];
    theme.layersTree.forEach(layer => {
      this.addLayerToLoadedList(layersList, layer);
    });

    // Update state only once at the end of the process to prevent 1000 of events to be sent
    this.state.layers.layersList = layersList;
  }

  addLayerToLoadedList(layersList, layer) {
    layersList.push(layer);
    layer.children.forEach(child => {
      this.addLayerToLoadedList(layersList, child);
    });
  }
}

export default ThemesManager