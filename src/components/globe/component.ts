import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import MenuButtonComponent from '../menubutton/component';

class GlobeComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  #menuButton?: MenuButtonComponent;

  constructor() {
    super('globe');
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
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
    });
  }
}

export default GlobeComponent;
