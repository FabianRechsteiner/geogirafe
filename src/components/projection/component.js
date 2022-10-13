import GeoEvents from '/models/events.js';
import GirafeHTMLElement from '/base/GirafeHTMLElement.js';

class ProjectionComponent extends GirafeHTMLElement {

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
    this.projectionSelect.addEventListener('change', (e) => this.onProjectionChanged(this, e));
  }

  onInitEvent(details) {
    if (details.action === 'initState') {
      if (details.state.projection !== 'null') {
        this.projectionSelect.value = details.state.projection;
      }
    }
  }

  onProjectionChanged(_this, e) {
    _this.messageManager.sendMessage(GeoEvents.Map, {action: 'projectionChanged', projection: e.target.value});
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
      this.initialized();
    });
  }

  initialized() {
    this.messageManager.sendMessage(GeoEvents.Init, {action: 'componentInitialized'});
  }
}

customElements.define('girafe-proj-select', ProjectionComponent);

export default ProjectionComponent;