import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { niceCoordinates } from '../../tools/geometrytools';

class CoordinateComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  locale!: string;
  east: string | null = null;
  north: string | null = null;

  constructor() {
    super('coordinate');
  }

  render() {
    super.render();
    this.locale = this.configManager.Config.general.locale;
  }

  registerEvents() {
    this.stateManager.subscribe('mouseCoordinates', (_oldCoordinates: number[], newCoordinates: number[]) => this.onChangeCoordinates(newCoordinates));
  }

  onChangeCoordinates(coord: number[]) {
    [this.east, this.north] = niceCoordinates(coord, this.locale);
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
