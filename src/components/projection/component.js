import GeoEvents from '/models/events.js';

class ProjectionComponent extends HTMLElement {

  static #template = null;
  
  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
  }

  async loadTemplate() {
    if (ProjectionComponent.#template !== null) {
      // Template was already loaded. Nothing to do.
      return;
    }
    // Otherwise, load the template
    const response = await fetch('/components/projection/template.html');
    const content = await response.text();
    ProjectionComponent.#template = document.createElement('template');
    ProjectionComponent.#template.innerHTML = content;
  }

  render() {
    // Clone component template and add it to the dom
    this.shadow.appendChild(ProjectionComponent.#template.content.cloneNode(true));
  }

  registerEvents() {
    //window.addEventListener(GeoEvents.TreeView, (e) => this.onTreeViewEvent(e.detail));
    const projectionSelect = this.shadow.querySelector('#projection');
    projectionSelect.addEventListener('change', this.onProjectionChanged);
  }

  onProjectionChanged(e) {
    console.log(e.target.value);
    window.dispatchEvent(new CustomEvent(GeoEvents.Map, { 
      bubbles: true, cancelable: false, composed: true, 
      detail: {
        action: 'projectionChanged',
        projection: e.target.value
      }
    }));
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-proj-select', ProjectionComponent);
