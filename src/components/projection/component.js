import GeoEvents from '/models/events.js';

class ProjectionComponent extends HTMLElement {

  static #template = null;

  projectionSelect = null;
  
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
    this.projectionSelect = this.shadow.querySelector('#projection');
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
    this.projectionSelect.addEventListener('change', this.onProjectionChanged);
  }

  onInitEvent(details) {
    if (details.action === 'initState') {
      if (details.state.projection !== 'null') {
        this.projectionSelect.value = details.state.projection;
      }
    }
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
      this.initialized();
    });
  }

  initialized() {
    window.dispatchEvent(new CustomEvent(GeoEvents.Init, { 
      bubbles: true, cancelable: false, composed: true, 
      detail: {
        action: 'componentInitialized'
      }
    }));
  }
}

customElements.define('girafe-proj-select', ProjectionComponent);

export default ProjectionComponent;