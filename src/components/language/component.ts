import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import MenuButtonComponent from '../menubutton/component';
import LanguageIcon from './images/language.svg';

class LanguageComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';
  public languageIcon: string = LanguageIcon;

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
    for (const key in this.configManager.Config.languages.translations) {
      this.languages.push(key);
    }

    super.render();
    this.#menuButton = this.shadow.querySelector('#menu-button')!;

    // Hide menu button if only one language
    if (this.languages.length == 1) {
      this.menuButton.hide();
    }
  }

  changeLanguage(language: string) {
    console.log('change language', language);
    this.state.language = language;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
    });
  }
}

export default LanguageComponent;
