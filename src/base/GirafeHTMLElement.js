import GeoEvents from '/models/events.js';
import I18nManager from '/tools/i18nmanager.js';

class GirafeHTMLElement extends HTMLElement {

  constructor() {
    super();
    window.addEventListener(GeoEvents.Translate, (e) => this.onTranslateEvent(e.detail));
  }

  onTranslateEvent(details) {
    if (details.action === 'languageChanged') {
      I18nManager.getInstance().translate(this.shadow, details.language);
    }
  }
}

export default GirafeHTMLElement;