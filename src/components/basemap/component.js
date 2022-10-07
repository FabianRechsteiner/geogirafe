import GeoEvents from '/models/events.js';

class BasemapComponent extends HTMLElement {

  static #template = null;
  themesUrl = null;
  basemapJson = {};
  basemaps = [];
  
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

    const select = this.shadow.querySelector('#basemap');

    // Add default OSM Option
    const option = document.createElement('option');
    option.innerHTML = 'OpenStreetMap';
    const basemap = {
      "type": 'OSM'
    }
    this.basemaps.push(basemap);
    option.value = this.basemaps.length-1;
    select.appendChild(option);

    // Add options from themes
    this.basemapJson.forEach(elem => {
      this.addOption(select, elem);
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
    //window.addEventListener(GeoEvents.TreeView, (e) => this.onTreeViewEvent(e.detail));
    const projectionSelect = this.shadow.querySelector('#basemap');
    projectionSelect.addEventListener('change', (e) => this.onBasemapChanged(this, e));
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
    }));
  }

  async loadThemes() {
    const response = await fetch(this.themesUrl);
    const content = await response.json();
    this.basemapJson = content["background_layers"];
  }
}

customElements.define('girafe-basemap-select', BasemapComponent);
