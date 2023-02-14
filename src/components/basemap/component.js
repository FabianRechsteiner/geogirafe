import GeoEvents from '../../models/events.js';
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import ButtonComponent from '../button/component.js';

class BasemapComponent extends GirafeHTMLElement {

  basemapJson = {};
  basemaps = [];
  basemapSelect = null;
  container = null;
  
  constructor() {
    super('basemap');
  }

  render() {
    super.render();

    this.container = this.shadow.querySelector('#container');
    this.basemapSelect = this.shadow.querySelector('#basemap');
    
    // TODO REG : Configure those 2 default options in themes.json
    // Add default OSM Option
    const osmBasemap = {"name": "OpenStreetMap", "type": 'OSM', "name": "OSM" }
    this.basemaps.push(osmBasemap);
    this.createButton(osmBasemap.name, this.basemaps.length-1);

    // Add default Vector Tiles
    const vectorBasemap = {
      "name": "Vector-Tiles",
      "type": "VectorTiles",
      "style": "https://vectortiles.geo.admin.ch/styles/ch.swisstopo.leichte-basiskarte.vt/style.json",
      "projection": "EPSG:3857"
    }
    this.basemaps.push(vectorBasemap);
    this.createButton(vectorBasemap.name, this.basemaps.length-1);

    // Add options from themes
    this.basemapJson.forEach(elem => {
      let basemap = elem;
      if (elem.children) {
        // TODO REG: use all children for basemap
        basemap = elem.children[0];
      }
      this.basemaps.push(basemap);
      this.createButton(elem.name, this.basemaps.length-1);
    });
  }

  createButton(label, basemapId) {
    const button = new ButtonComponent();
    button.setAttribute('text', label);
    button.setAttribute('size', 'large');
    button.classList.add('border-top');
    button.onClick = () => this.onBasemapChanged(basemapId);
    this.container.appendChild(button);
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
  }

  onInitEvent(details) {
    if (details.action === 'initState') {
      if (details.state.basemap !== 'null') {
        // Find the basemap id from the name
        const index = this.basemaps.findIndex(item => item.name === details.state.basemap);
        this.messageManager.sendMessage(GeoEvents.Map, {action: 'basemapChanged', basemap: this.basemaps[index]});
      }
    }
  }

  onBasemapChanged(index) {
    const basemap = this.basemaps[index];
    if (!this.isNullOrUndefined(basemap.projection)) {
      // Automatically change projection for this background layer
      this.messageManager.sendMessage(GeoEvents.Map, {action: 'changeProjection', projection: basemap.projection});
    }
    this.messageManager.sendMessage(GeoEvents.Map, {action: 'basemapChanged', basemap: basemap});
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
    this.basemapJson = content["background_layers"];
  }
}

customElements.define('girafe-basemap', BasemapComponent);

export default BasemapComponent;
