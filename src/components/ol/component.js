import Map from 'ol/Map';
import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';

class OLComponent extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
  }

  connectedCallback() {
    console.log('connectedCallback');
    this.loadTemplate();
  }

  disconnectedCallback() {
    console.log('disconnectedCallback');
  }

  adoptedCallback(oldDocument, newDocument) {
    console.log('adoptedCallback');
  }

  attributeChangedCallback(name, oldValue, newValue, namespace) {
    console.log('attributeChangedCallback');
  }

  loadTemplate() {
    fetch('/components/ol/template.html')
      .then(response => response.text())
      .then(t => {
        console.log(t);
        const template = document.createElement('template');
        template.innerHTML = t;
        this.template = template;
        this.render();
      });
  }

  render() {
    // Clone component template and add it to the dom
    this.shadow.appendChild(this.template.content.cloneNode(true));

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
  }
}

customElements.define('ol-map', OLComponent);
