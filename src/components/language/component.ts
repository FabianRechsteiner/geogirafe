import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import MenuButtonComponent from '../menubutton/component';

class LanguageComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  languages: string[] = [];
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
    // Get languages list and store it
    for (const key in this.configManager.Config.languages) {
      if (!key.startsWith("//") && key !== 'default') {
        this.languages.push(key);
      }
    }

    super.render();
    this.#menuButton = this.shadow.querySelector('#menu-button')!;
  }

  changeLanguage(language: string) {
    console.log('change language', language);
    this.state.language = language;
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
