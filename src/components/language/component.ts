import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import LanguageIcon from './images/language.svg';

class LanguageComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';
  public languageIcon: string = LanguageIcon;

  languages: string[] = [];

  constructor() {
    super('language');
  }

  render() {
    // Get languages list and store it
    for (const key in this.configManager.Config.languages.translations) {
      this.languages.push(key);
    }

    super.render();

    // Hide menu button if only one language
    if (this.languages.length == 1) {
      (this.shadow.host as GirafeHTMLElement).hide();
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
