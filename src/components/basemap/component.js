import GeoEvents from '../../models/events.js';
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import GeoConfig from '../../config';


class BasemapComponent extends GirafeHTMLElement {

  themesUrl = null;
  basemapJson = {};
  basemaps = [];
  basemapSelect = null;
  
  constructor() {
    super('basemap');
    this.themesUrl = GeoConfig.themes.url;
  }

  render() {
    super.render();

    this.basemapSelect = this.shadow.querySelector('#basemap');
    
    // TODO REG : Configure those 2 default options in themes.json
    // Add default OSM Option
    const option = document.createElement('option');
    option.innerHTML = 'OpenStreetMap';
    const basemap = {
      "type": 'OSM',
      "name": "OSM"
    }
    this.basemaps.push(basemap);
    option.value = this.basemaps.length-1;
    this.basemapSelect.appendChild(option);

    // Add default Vector Tiles
    const vectorOption = document.createElement('option');
    vectorOption.innerHTML = 'Vector-Tiles (EPSG:3857 only)';
    const vectorBasemap = {
      "name": "Vector-Tiles (EPSG:3857 only)",
      "type": "VectorTiles",
      "style": "https://vectortiles.geo.admin.ch/styles/ch.swisstopo.leichte-basiskarte.vt/style.json"
    }
    this.basemaps.push(vectorBasemap);
    vectorOption.value = this.basemaps.length-1;
    this.basemapSelect.appendChild(vectorOption);

    // Add options from themes
    this.basemapJson.forEach(elem => {
      this.addOption(this.basemapSelect, elem);
    });
  }

  addOption(select, elem) {
    // Create new basemap option
    const option = document.createElement('option');
    option.innerHTML = elem.name;

    let basemap = elem;
    if (elem.children) {
      // TODO REG: use all children for basemap
      basemap = elem.children[0];
    }

    // fill array with all info about basemaps 
    // (referenced by array index in select.value)
    this.basemaps.push(basemap);
    option.value = this.basemaps.length - 1;
  
    // Add to select
    select.appendChild(option);
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
    this.basemapSelect.addEventListener('change', (e) => this.onBasemapChanged(this, e));
  }

  onInitEvent(details) {
    if (details.action === 'initState') {
      if (details.state.basemap !== 'null') {
        // Find the basemap id from the name
        const index = this.basemaps.findIndex(item => item.name === details.state.basemap);
        this.basemapSelect.value = index;
        this.messageManager.sendMessage(GeoEvents.Map, {action: 'basemapChanged', basemap: this.basemaps[index]});
      }
    }
  }

  onBasemapChanged(_this, e) {
    this.messageManager.sendMessage(GeoEvents.Map, {action: 'basemapChanged', basemap: _this.basemaps[e.target.value]});
  }

  connectedCallback() {
    this.loadTemplate()
    .then(() => this.loadThemes()
      .then(() => {
        this.render();
        this.registerEvents();
        super.initialized();
    }));
  }

  async loadThemes() {
    const response = await fetch(this.themesUrl);
    const content = await response.json();
    this.basemapJson = content["background_layers"];
  }
}

customElements.define('girafe-basemap-select', BasemapComponent);

export default BasemapComponent;
