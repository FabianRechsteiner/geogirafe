import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { niceCoordinates } from '../../tools/geometrytools';

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
    [this.east, this.north] = niceCoordinates(coord);
    this.render();
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-coordinate', CoordinateComponent);

export default CoordinateComponent;