import GeoEvents from '/models/events.js';
import GirafeDraggableElement from '/base/GirafeDraggableElement.js';

class ToolbarComponent extends GirafeDraggableElement {

  static #template = null;

  bar = null
  pointButton = null;
  lineButton = null;
  squareButton = null;
  rectangleButton = null;
  polygonButton = null;
  circleButton = null;
  freeButton = null;
  
  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
  }

  async loadTemplate() {
    if (ToolbarComponent.#template !== null) {
      // Template was already loaded. Nothing to do.
      return;
    }
    // Otherwise, load the template
    const response = await fetch('/components/redlining/toolbar/template.html');
    const content = await response.text();
    ToolbarComponent.#template = document.createElement('template');
    ToolbarComponent.#template.innerHTML = content;
  }

  render() {
    // Clone component template and add it to the dom
    this.shadow.appendChild(ToolbarComponent.#template.content.cloneNode(true));

    // Bar is hidden per default
    this.bar = this.shadow.querySelector('#draggable');
    this.bar.style.display = 'none';

    this.pointButton = this.shadow.querySelector('#point');
    this.lineButton = this.shadow.querySelector('#line');
    this.squareButton = this.shadow.querySelector('#square');
    this.rectangleButton = this.shadow.querySelector('#rectangle');
    this.polygonButton = this.shadow.querySelector('#polygon');
    this.circleButton = this.shadow.querySelector('#circle');
    this.freeButton = this.shadow.querySelector('#free');

    this.makeDraggable();
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Redlining, (e) => this.onRedliningEvent(e.detail));

    this.pointButton.addEventListener('click', (e) => this.activateDraw('Point'));
    this.lineButton.addEventListener('click', (e) => this.activateDraw('LineString'));
    this.squareButton.addEventListener('click', (e) => this.activateDraw('Square'));
    this.rectangleButton.addEventListener('click', (e) => this.activateDraw('Rectangle'));
    this.polygonButton.addEventListener('click', (e) => this.activateDraw('Polygon'));
    this.circleButton.addEventListener('click', (e) => this.activateDraw('Circle'));
    this.freeButton.addEventListener('click', (e) => this.activateDraw('Free'));
  }

  activateDraw(tool) {
    window.dispatchEvent(new CustomEvent(GeoEvents.Redlining, { 
      bubbles: true, cancelable: false, composed: true, 
      detail: {
        action: 'drawToolActivated',
        tool: tool
      }
    }));
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
    });
  }

  onRedliningEvent(details) {
    if (details.action === 'redliningActivated') {
      this.bar.style.display = 'block';
    }
  }
}

customElements.define('girafe-toolbar', ToolbarComponent);

export default ToolbarComponent;