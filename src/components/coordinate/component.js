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
    this.stateManager.subscribe('mouseCoordinates', (oldCoordinates, newCoordinates) => this.onChangeCoordinates(newCoordinates));
  }

  onChangeCoordinates(coord) {
    const east = (Math.round(coord[0] * 100) / 100).toLocaleString(this.locale, {minimumFractionDigits: 2});
    const nord = (Math.round(coord[1] * 100) / 100).toLocaleString(this.locale, {minimumFractionDigits: 2});
    this.coordsSpan.innerHTML = `E ${east} / N ${nord}`;
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      super.translate();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-coordinate', CoordinateComponent);

export default CoordinateComponent;