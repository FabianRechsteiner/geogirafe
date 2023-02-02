import GeoEvents from '../../models/events.js';
import GirafeHTMLElement from '../../base/GirafeHTMLElement.js';

class ProjectionComponent extends GirafeHTMLElement {

  menuButton = null;
  valueToText = {
    "EPSG:3857": "W-M",
    "EPSG:4326": "WGS84",
    "EPSG:2056": "LV95"
  }
  
  constructor() {
    super('projection');
  }

  render() {
    super.render();
    this.menuButton = this.shadow.querySelector('#menu-button');

    // Get all combinaison text/value from girafe-button objects
    const allButtons = this.shadow.querySelectorAll('girafe-button');
    for (let i=0; i<allButtons.length; ++i) {
      const b = allButtons[i];
      b.setText(this.valueToText[b.dataset.projection]);
    }
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));
  }

  onInitEvent(details) {
    if (details.action === 'initState') {
      if (!this.isNullOrUndefined(details.state.projection)) {
        const text = this.valueToText[details.state.projection];
        this.menuButton.setText(text);
      }
    }
  }

  onMapEvent(details) {
    if (details.action === 'projectionChanged') {
      const text = this.valueToText[details.projection];
      this.menuButton.setText(text);
      this.menuButton.closeMenu();
    }
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
      super.initialized();
    });
  }
}

customElements.define('girafe-proj-select', ProjectionComponent);

export default ProjectionComponent;