import GeoEvents from '/models/events.js';

class BasemapComponent extends HTMLElement {

  static #template = null;
  themesUrl = null;
  basemapJson = {};
  basemaps = [];
  basemapSelect = null;
  
  constructor() {
    super();
    this.themesUrl = this.getAttribute('themes');
    this.shadow = this.attachShadow({mode: 'open'});
  }

  async loadTemplate() {
    if (BasemapComponent.#template !== null) {
      // Template was already loaded. Nothing to do.
      return;
    }
    // Otherwise, load the template
    const response = await fetch('/components/basemap/template.html');
    const content = await response.text();
    BasemapComponent.#template = document.createElement('template');
    BasemapComponent.#template.innerHTML = content;
  }

  render() {
    // Clone component template and add it to the dom
    this.shadow.appendChild(BasemapComponent.#template.content.cloneNode(true));

    this.basemapSelect = this.shadow.querySelector('#basemap');
    
    // Add default OSM Option
    const option = document.createElement('option');
    option.innerHTML = 'OpenStreetMap';
    const basemap = {
      "type": 'OSM'
    }
    this.basemaps.push(basemap);
    option.value = this.basemaps.length-1;
    this.basemapSelect.appendChild(option);

    // Add options from themes
    this.basemapJson.forEach(elem => {
      this.addOption(this.basemapSelect, elem);
    });
  }

  addOption(select, elem) {
    // Create new basemap option
    const option = document.createElement('option');
    option.innerHTML = elem.name;

    let child = elem;
    if (elem.children) {
      // TODO REG: use all children for basemap
      child = elem.children[0];
    }

    // fill array with all info about basemaps 
    // (referenced by array index in select.value)
    const basemap = {
      "name": child.name,
      "type": child.type,
      "url": child.url
    }
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
        window.dispatchEvent(new CustomEvent(GeoEvents.Map, { 
          bubbles: true, cancelable: false, composed: true, 
          detail: {
            action: 'basemapChanged',
            basemap: this.basemaps[index]
          }
        }));
      }
    }
  }

  onBasemapChanged(_this, e) {
    console.log(e.target.value);
    window.dispatchEvent(new CustomEvent(GeoEvents.Map, { 
      bubbles: true, cancelable: false, composed: true, 
      detail: {
        action: 'basemapChanged',
        basemap: _this.basemaps[e.target.value]
      }
    }));
  }

  connectedCallback() {
    this.loadTemplate()
    .then(() => this.loadThemes()
      .then(() => {
        this.render();
        this.registerEvents();
        this.initialized();
    }));
  }

  initialized() {
    window.dispatchEvent(new CustomEvent(GeoEvents.Init, { 
      bubbles: true, cancelable: false, composed: true, 
      detail: {
        action: 'componentInitialized'
      }
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
