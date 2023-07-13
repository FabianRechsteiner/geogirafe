import GirafeHTMLElement from '../../base/GirafeHTMLElement.js';

class CoordinateComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  locale = null;
  east = null;
  north = null;

  constructor() {
    super('coordinate');
  }

  render() {
    super.render();
    this.locale = this.configManager.Config.general.locale;
  }

  registerEvents() {
    this.stateManager.subscribe('mouseCoordinates', (oldCoordinates, newCoordinates) => this.onChangeCoordinates(newCoordinates));
  }

  onChangeCoordinates(coord) {
    this.east = (Math.round(coord[0] * 100) / 100).toLocaleString(this.locale, {minimumFractionDigits: 2});
    this.north = (Math.round(coord[1] * 100) / 100).toLocaleString(this.locale, {minimumFractionDigits: 2});

    this.render();
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.translate();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-coordinate', CoordinateComponent);

export default CoordinateComponent;