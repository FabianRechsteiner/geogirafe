import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import MenuButtonComponent from '../menubutton/component';

class ProjectionComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  projections: Record<string, string> = {};
  #menuButton?: MenuButtonComponent;

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
    // Get projections list and store it
    this.projections = this.configManager.Config.projections;
    for (const key in this.projections) {
      if (key.startsWith('//')) {
          delete this.projections[key];
      }
    }

    // Only display menu button if several projections
    console.log("projection", this.projections, Object.keys(this.projections).length)
    if (Object.keys(this.projections).length > 1) {
      super.render();
      this.#menuButton = this.shadow.querySelector('#menu-button')!;
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
    const text = this.projections[projection];
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
