import GeoEvents from '../../models/events.js';
import GirafeHTMLElement from '../../base/GirafeHTMLElement.js';

class CoordinateComponent extends GirafeHTMLElement {

  coordsSpan = null;
  locale = null;

  constructor() {
    super('coordinate');
  }

  render() {
    super.render();
    this.coordsSpan = this.shadow.querySelector('#coords');
    this.locale = this.configManager.Config.general.locale;
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));
  }

  onMapEvent(details) {
    if (details.action === 'pointerMove') {
      this.formatCoordinate(details.coordinate);
    }
  }

  formatCoordinate(coord) {
    const east = Math.round(coord[0], 3).toLocaleString(this.locale);
    const nord = Math.round(coord[1], 3).toLocaleString(this.locale);
    this.coordsSpan.innerHTML = `E ${east} / N ${nord}`;
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

customElements.define('girafe-coordinate', CoordinateComponent);

export default CoordinateComponent;