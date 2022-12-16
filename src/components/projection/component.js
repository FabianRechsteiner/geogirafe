import GeoEvents from '/models/events.js';
import GirafeHTMLElement from '/base/GirafeHTMLElement.js';

class ProjectionComponent extends GirafeHTMLElement {

  projectionSelect = null;
  
  constructor() {
    super('projection');
  }

  render() {
    super.render();
    this.projectionSelect = this.shadow.querySelector('#projection');
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));
    this.projectionSelect.addEventListener('change', (e) => this.onProjectionChanged(this, e));
  }

  onInitEvent(details) {
    if (details.action === 'initState') {
      if (details.state.projection !== 'null') {
        this.projectionSelect.value = details.state.projection;
      }
    }
  }

  onMapEvent(details) {
    if (details.action === 'projectionChanged') {
      this.onChangeProjection(details.projection);
    }
  }

  onChangeProjection(projection) {
    if (this.projectionSelect.value !== projection) {
      this.projectionSelect.value = projection;
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