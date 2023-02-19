import GeoEvents from '../../models/events.js';
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import ButtonComponent from '../button/component.js';
import Layer from '../../models/layer';

class BasemapComponent extends GirafeHTMLElement {

  servers = {};
  basemapJson = {};
  basemaps = [];
  container = null;
  
  constructor() {
    super('basemap');
  }

  render() {
    super.render();

    this.container = this.shadow.querySelector('#container');

    const defaultBasemap = this.configManager.Config.themes.defaultBasemap;
    let defaultBasemapIndex;
    
    // TODO REG : Configure those 2 default options in themes.json
    // Add default OSM Option
    const osmBasemap = this.createLayer({"name": "OpenStreetMap", "type": 'OSM' }, 0);
    this.basemaps.push(osmBasemap);
    this.createButton(osmBasemap.name, this.basemaps.length - 1);
    if (defaultBasemap === osmBasemap.name) {
      defaultBasemapIndex = this.basemaps.length - 1;
    }

    // Add default Vector Tiles
    const vectorBasemap = new Layer({
      "name": "Vector-Tiles",
      "type": "VectorTiles",
      "style": "https://vectortiles.geo.admin.ch/styles/ch.swisstopo.leichte-basiskarte.vt/style.json",
      "projection": "EPSG:3857"
    }, 0);
    this.basemaps.push(vectorBasemap);
    this.createButton(vectorBasemap.name, this.basemaps.length - 1);
    if (defaultBasemap === vectorBasemap.name) {
      defaultBasemapIndex = this.basemaps.length - 1;
    }

    // Add options from themes
    this.basemapJson.forEach(elem => {
      if (elem.children) {
        // A basemap configuration can contain many layers
        const layerList = [];
        let order = 0;
        elem.children.forEach(elem => {
          const layer = this.createLayer(elem, order);
          layerList.push(layer);
          order++;
        });
        this.basemaps.push(layerList);
      }
      else {
        // Only one layer in this basemap
        let basemap = this.createLayer(elem, 0);
        this.basemaps.push(basemap);
      }
      this.createButton(elem.name, this.basemaps.length - 1);
      if (defaultBasemap === elem.name) {
        defaultBasemapIndex = this.basemaps.length - 1;
      }
    });

    if (!this.isNullOrUndefined(defaultBasemapIndex)) {
      this.onBasemapChanged(defaultBasemapIndex);
    }
  }

  createButton(label, basemapId) {
    const button = new ButtonComponent();
    button.setAttribute('text', label);
    button.setAttribute('size', 'large');
    button.classList.add('border-top');
    // TODO REG: When using onClick event here instead of message and action attributes, 
    // the menu won't close autoamtically. Why?
    button.onClick = () => this.onBasemapChanged(basemapId);
    this.container.appendChild(button);
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
  }

  onInitEvent(details) {
    if (details.action === 'initState') {
      // if (details.state.basemap !== 'null') {
      //   // Find the basemap id from the name
      //   const index = this.basemaps.findIndex(item => item.name === details.state.basemap);
      //   this.messageManager.sendMessage(GeoEvents.Map, {action: 'basemapChanged', basemap: this.basemaps[index]});
      // }
    }
  }

  onBasemapChanged(index) {
    const basemap = this.basemaps[index];
    if (!this.isNullOrUndefined(basemap.projection)) {
      // Automatically change projection for this background layer
      this.messageManager.sendMessage(GeoEvents.Map, {action: 'changeProjection', projection: basemap.projection});
    }

    if (basemap instanceof Layer) {
      // Single basemap, bu we always send a list
      this.messageManager.sendMessage(GeoEvents.Map, {action: 'changeBasemap', basemapList: [basemap]});
    }
    else {
      // List of basemaps
      this.messageManager.sendMessage(GeoEvents.Map, {action: 'changeBasemap', basemapList: basemap});
    }
  }

  // TODO REG : Factorize with the method from treeview ?
  createLayer(elem, order) {
    let layer = null;
    if (elem.type === 'WMS') {
      // WMS Case: there must be an OGC-Server
      if (elem.ogcServer) {
        const ogcServer = this.servers[elem.ogcServer];
        layer = new Layer(elem, elem.ogcServer, ogcServer.url);
      }
      else {
        throw 'No OGC server found for WMS layer ' + elem.name;
      }
    }
    else {
      layer = new Layer(elem);
    }

    layer.id = order;
    layer.order = order;
    layer.basemap = true;
    return layer;
  }

  connectedCallback() {
    this.loadTemplate()
    .then(() => this.loadThemes()
      .then(() => {
        this.render();
        super.translate();
        this.registerEvents();
        super.initialized();
    }));
  }

  async loadThemes() {
    const response = await fetch(this.configManager.Config.themes.url);
    const content = await response.json();
    this.servers = content["ogcServers"];
    this.basemapJson = content["background_layers"];
  }
}

customElements.define('girafe-basemap', BasemapComponent);

export default BasemapComponent;
