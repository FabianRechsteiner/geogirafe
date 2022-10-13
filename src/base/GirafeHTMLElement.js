import GeoEvents from '/models/events';
import I18nManager from '/tools/i18nmanager';
import MessageManager from '/tools/messagemanager';

class GirafeHTMLElement extends HTMLElement {

  messageManager = null

  constructor() {
    super();
    this.messageManager = MessageManager.getInstance();
    window.addEventListener(GeoEvents.Translate, (e) => this.onTranslateEvent(e.detail));
  }

  onTranslateEvent(details) {
    if (details.action === 'languageChanged') {
      I18nManager.getInstance().translate(this.shadow, details.language);
    }
  }
}

export default GirafeHTMLElement;