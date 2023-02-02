import GeoEvents from '../../models/events.js';
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import I18nManager from '../../tools/i18nmanager';
import GeoConfig from '../../config';

class LanguageComponent extends GirafeHTMLElement {

  menuButton = null;
  
  constructor() {
    super('language');
  }

  render() {
    super.render();
    this.menuButton = this.shadow.querySelector('#menu-button');

    // Default language
    const defaultLanguage = GeoConfig.languages.default;
    I18nManager.getInstance().setDefaultLanguage(defaultLanguage);
    this.menuButton.setText(defaultLanguage.toUpperCase());
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
    window.addEventListener(GeoEvents.Translate, (e) => this.onTranslateEvent(e.detail));
  }

  onTranslateEvent(details) {
    if (details.action === 'languageChanged') {
      this.menuButton.setText(details.language.toUpperCase());
      this.menuButton.closeMenu();
    }
  }

  onInitEvent(details) {
    if (details.action === 'initState') {
      console.log(details.state);
      if (!this.isNullOrUndefined(details.state.language)) {
        this.menuButton.setText(details.state.language.toUpperCase());
      }
    }
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
      super.initialized();
    });
  }
}

customElements.define('girafe-language-select', LanguageComponent);

export default LanguageComponent;