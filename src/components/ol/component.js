import Map from 'ol/Map';
import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import GeoEvents from '/models/events.js';
import { makeObservable, observable, computed, action } from "mobx"

class OLComponent extends HTMLElement {

  static #template = null;
  counter = 0;
  
  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
    this.registerEvents();

    makeObservable(this, {
      counter: observable,
      test: computed
    });
  }

  get test() {
    console.log(this.counter);
  }

  registerEvents() {
    window.addEventListener(GeoEvents.TreeView, (e) => this.onTreeViewEvent(e.detail));
  }

  async loadTemplate() {
    if (OLComponent.#template !== null) {
      // Template was already loaded. Nothing to do.
      return;
    }
    // Otherwise, load the template
    const response = await fetch('/components/ol/template.html');
    const content = await response.text();
    OLComponent.#template = document.createElement('template');
    OLComponent.#template.innerHTML = content;
  }

  render() {

    // Clone component template and add it to the dom
    this.shadow.appendChild(OLComponent.#template.content.cloneNode(true));

    // Create map element
    let target = this.shadow.querySelector('#ol-map-container');
    this.map = new Map({
      target: target,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({ 
        center: [0, 0],
        zoom: 2,
      }),
    });

    let b = this.shadow.querySelector('#test');
    b.onclick = () => this.counter++;
  }

  listenOpenLayersEvents() {
    // https://openlayers.org/en/latest/apidoc/module-ol_Map-Map.html
    //this.map.on('change', (e) => console.log(e));
    //this.map.on('click', (e) => console.log(e));
    //this.map.on('dblclick', (e) => console.log(e));
    //this.map.on('error', (e) => console.log(e));
    //this.map.on('loadend', (e) => console.log(e));
    //this.map.on('loadstart', (e) => console.log(e));
    this.map.on('moveend', (e) => console.log(e));
    //this.map.on('movestart', (e) => console.log(e));
    //this.map.on('pointerdrag', (e) => console.log(e));
    //this.map.on('pointermove', (e) => console.log(e));
    //this.map.on('postcompose', (e) => console.log(e));
    //this.map.on('postrender', (e) => console.log(e));
    //this.map.on('precompose', (e) => console.log(e));
    //this.map.on('propertychange', (e) => console.log(e));
    //this.map.on('rendercomplete', (e) => console.log(e));
    //this.map.on('singleclick ', (e) => console.log(e));
    //? change:layerGroup
    //? change:size
    //? change:target
    //? change:view
  }

  connectedCallback() {
    console.log('connectedCallback');
    this.loadTemplate().then(() => {
      this.render();
      this.listenOpenLayersEvents()
    });
  }

  attributeChangedCallback(name, oldValue, newValue, namespace) {
    console.log('attributeChangedCallback');
  }

  onTreeViewEvent(details) {
    console.log(details);
  }
}

customElements.define('ol-map', OLComponent);
