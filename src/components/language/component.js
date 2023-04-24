import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class LanguageComponent extends GirafeHTMLElement {

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
    this.loadTemplate().then(() => {
      this.render();
      super.translate();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-language-select', LanguageComponent);

export default LanguageComponent;