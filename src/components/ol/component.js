import Map from 'ol/Map';
import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import GeoEvents from '/models/events.js';
import { getPointResolution, get as getProjection, transform} from 'ol/proj';


class OLComponent extends HTMLElement {

  static #template = null;
  
  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
    this.registerEvents();
  }

  registerEvents() {
    window.addEventListener(GeoEvents.TreeView, (e) => this.onTreeViewEvent(e.detail));
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));
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

    // TODO REG: This is ugly, but I didn't find any other solution yet.
    setTimeout(() => {
      this.map.updateSize();
    }, 1000);
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
      this.listenOpenLayersEvents();
    });
  }

  attributeChangedCallback(name, oldValue, newValue, namespace) {
    console.log('attributeChangedCallback');
  }

  onTreeViewEvent(details) {
    console.log(details);
  }

  onMapEvent(details) {
    console.log(details);
    if (details.action === 'projectionChanged') {
      console.log('NEW PROJ: ' + details.projection);
      this.onChangeProjection(details.projection);
    }
  }

  onChangeProjection(projection) {
    const newProjection = getProjection(projection);
    const currentView = this.map.getView();
    const currentProjection = currentView.getProjection();
    const currentResolution = currentView.getResolution();
    const currentCenter = currentView.getCenter();
    const currentRotation = currentView.getRotation();
    const newCenter = transform(currentCenter, currentProjection, newProjection);
    const currentMPU = currentProjection.getMetersPerUnit();
    const newMPU = newProjection.getMetersPerUnit();
    const currentPointResolution =
      getPointResolution(currentProjection, 1 / currentMPU, currentCenter, 'm') *
      currentMPU;
    const newPointResolution =
      getPointResolution(newProjection, 1 / newMPU, newCenter, 'm') * newMPU;
    const newResolution =
      (currentResolution * currentPointResolution) / newPointResolution;
    const newView = new View({
      center: newCenter,
      resolution: newResolution,
      rotation: currentRotation,
      projection: newProjection,
    });
    this.map.setView(newView);
  }
}

customElements.define('ol-map', OLComponent);
