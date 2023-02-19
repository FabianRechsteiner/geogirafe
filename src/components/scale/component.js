import GeoEvents from '../../models/events.js';
import GirafeHTMLElement from '../../base/GirafeHTMLElement.js';
import ButtonComponent from '../button/component.js';

class ScaleComponent extends GirafeHTMLElement {

  scaleSpan = null;
  locale = null;
  container = null;
  scales = null;
  
  constructor() {
    super('scale');
  }

  render() {
    super.render();
    this.container = this.shadow.querySelector('#container');
    this.scaleSpan = this.shadow.querySelector('#scale');
    this.locale = this.configManager.Config.general.locale;
    this.scales = this.configManager.Config.map.scales;

    // Add options from themes
    this.scales.forEach(scale => {
      const button = new ButtonComponent();
      button.setAttribute('text', this.formatScale(scale));
      button.setAttribute('size', 'large');
      button.setAttribute('message', 'Map');
      button.setAttribute('action', 'changeScale');
      button.dataset.scale = scale;
      this.container.appendChild(button);
    });
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));
  }

  onMapEvent(details) {
    if (details.action === 'resolutionChanged') {
      this.scaleSpan.innerHTML = this.formatScale(details.scale);
    }
  }

  formatScale(scale) {
    return '1:' + Math.floor(scale).toLocaleString(this.locale);
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