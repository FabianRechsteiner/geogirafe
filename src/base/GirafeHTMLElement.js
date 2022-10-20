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

  activateTooltips() {
    const elementsWithTooltip = Array.from(this.shadow.querySelectorAll('[tip]'));
    elementsWithTooltip.forEach(el => {
      let tip = document.createElement('div');
      tip.classList.add('tooltip');
      tip.innerText = el.getAttribute('tip');
      //let delay = el.getAttribute('tip-delay');
      //if (delay) {
        //tip.style.transitionDelay = delay + 's';
      tip.style.transitionDelay = '0.8s';
      //}
      tip.style.transform =
        'translate(' +
          (el.hasAttribute('tip-left') ? 'calc(-100% - 5px)' : '15px') + ', ' +
          (el.hasAttribute('tip-top') ? '-100%' : '0') +
        ')';
      el.appendChild(tip);
      el.onmousemove = e => {
        tip.style.left = e.clientX + 'px'
        tip.style.top = e.clientY + 'px';
      };
    });
  }
}

export default GirafeHTMLElement;