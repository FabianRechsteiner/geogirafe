import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class LanguageComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  menuButton = null;
  
  constructor() {
    super('language');
  }

  render() {
    super.render();
    this.menuButton = this.shadow.querySelector('#menu-button');
  }

  registerEvents() {
    this.stateManager.subscribe('language', (oldLanguage, newLanguage) => this.onTranslate(newLanguage));
  }

  onTranslate(language) {
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