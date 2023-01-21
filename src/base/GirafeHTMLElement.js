import tippy from 'tippy.js';
import GeoEvents from '../models/events';
import I18nManager from '../tools/i18nmanager';
import MessageManager from '../tools/messagemanager';

class GirafeHTMLElement extends HTMLElement {

  static #templates = {};
  component = null;

  get templateUrl() {
    return `/components/${this.component}/template.html`;
  }

  get template() {
    return GirafeHTMLElement.#templates[this.component];
  }

  messageManager = null

  constructor(component) {
    super();
    this.messageManager = MessageManager.getInstance();
    window.addEventListener(GeoEvents.Translate, (e) => this.onTranslateEvent(e.detail));
    this.component = component;
    this.shadow = this.attachShadow({mode: 'open'});
  }

  async loadTemplate() {
    if (this.component in GirafeHTMLElement.#templates) {
      // Template was already loaded. Nothing to do.
      return;
    }
    // Otherwise, load the template
    const response = await fetch(this.templateUrl);
    const content = await response.text();

    const template = document.createElement('template');
    template.innerHTML = content;
    GirafeHTMLElement.#templates[this.component] = template;
  }

  render() {
    // Clone component template and add it to the dom
    this.shadow.appendChild(this.template.content.cloneNode(true));
  }

  onTranslateEvent(details) {
    if (details.action === 'languageChanged') {
      I18nManager.getInstance().translate(this.shadow);
    }
  }

  isNullOrUndefined(val) {
    return (val === undefined || val === null);
  }

  isNullOrUndefinedOrBlank(val) {
    return (val === undefined || val === null || val === '');
  }

  delayed(functionToWatch, functionToExecute) {
    const observer = new MutationObserver((mutations, obs) => {
      if (functionToWatch()) {
        functionToExecute();
        obs.disconnect();
      }
    });
    
    observer.observe(this.shadow, { childList: true, subtree: true });
  }

  getParentOfType(parentNodeName, elem) {
    // Stop case : we found null or an object of the right type
    if (elem === null || elem.nodeName === parentNodeName) {
      return elem;
    }

    // Otherwise, we try to find a parent recursively
    let parent = null;
    if (elem instanceof ShadowRoot) {
      parent = elem.host;
    }
    else {
      parent = elem.parentNode;
    }

    return this.getParentOfType(parentNodeName, parent);
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
  
  initialized() {
    this.messageManager.sendMessage(GeoEvents.Init, {action: 'componentInitialized'});
  }
}

export default GirafeHTMLElement;