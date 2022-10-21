import tippy from 'tippy.js';
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

  isNullOrUndefined(val) {
    return (val === undefined || val === null);
  }

  activateTooltips(arrow, delay, placement) {
    const elementsWithTooltip = Array.from(this.shadow.querySelectorAll('[tip]'));
    elementsWithTooltip.forEach(el => {
      tippy(el, {
        arrow: arrow,
        delay: delay,
        placement: placement,
        //animateFill: false,
        //animation: 'scale-with-inertia',
        content: el.getAttribute('tip')
      })
    });
  }
}

export default GirafeHTMLElement;