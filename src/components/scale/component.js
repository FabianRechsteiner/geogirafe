import GeoEvents from '../../models/events.js';
import GirafeHTMLElement from '../../base/GirafeHTMLElement.js';

class ScaleComponent extends GirafeHTMLElement {

  scaleSpan = null;
  locale = null;

  constructor() {
    super('scale');
  }

  render() {
    super.render();
    this.scaleSpan = this.shadow.querySelector('#scale');
    this.locale = this.configManager.Config.general.locale;
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));
  }

  onMapEvent(details) {
    if (details.action === 'resolutionChanged') {
      this.scaleSpan.innerHTML ='1:' + Math.floor(details.scale).toLocaleString(this.locale);
    }
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      super.translate();
      this.registerEvents();
      //super.initialized();
    });
  }
}

customElements.define('girafe-scale', ScaleComponent);

export default ScaleComponent;