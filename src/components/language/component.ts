import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import MenuButtonComponent from '../menubutton/component'

class LanguageComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  #menuButton?: MenuButtonComponent;

  constructor() {
    super('language');
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

  registerEvents() {
    this.stateManager.subscribe('language', (_oldLanguage: string, newLanguage: string) => this.onTranslate(newLanguage));
  }

  onTranslate(language: string) {
    this.menuButton.setText(language.toUpperCase());
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

customElements.define('girafe-language-select', LanguageComponent);

export default LanguageComponent;
