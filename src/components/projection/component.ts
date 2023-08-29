import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import ButtonComponent from '../menubutton/component';
import MenuButtonComponent from '../menubutton/component';

class ProjectionComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  #menuButton?: MenuButtonComponent;
  // TODO REG : manage in config.json
  valueToText: Record<string, string> = {
    "EPSG:3857": "W-M",
    "EPSG:4326": "WGS84",
    "EPSG:2056": "LV95"
  }

  constructor() {
    super('projection');
  }

  get menuButton() {
    if (!this.#menuButton) {
      throw new Error('You called menuButton before render');
    }
    return this.#menuButton;
  }

  render() {
    super.render();
    this.#menuButton = this.shadow.querySelector('#menu-button')!;

    // Get all combinaison text/value from girafe-button objects
    const allButtons = this.shadow.querySelectorAll('girafe-button');
    for (let i=0; i<allButtons.length; ++i) {
      const button = allButtons[i] as ButtonComponent;
      const projection = button.id.toUpperCase();
      button.setText(this.valueToText[projection]);
    }
  }

  changeProjection(projection: string) {
    console.log('change projection', projection);
    this.state.projection = projection;
  }

  registerEvents() {
    this.stateManager.subscribe('projection', (_oldProjection: string, newProjection: string) => this.onChangeProjection(newProjection));
  }

  onChangeProjection(projection: string) {
    console.log('projection changed');
    const text = this.valueToText[projection];
    this.menuButton.setText(text);
    this.menuButton.closeMenu();
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-proj-select', ProjectionComponent);

export default ProjectionComponent;
