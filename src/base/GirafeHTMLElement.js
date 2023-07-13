import { render as uRender } from 'uhtml';
import tippy from 'tippy.js';
import I18nManager from '../tools/i18nmanager';
import MessageManager from '../tools/messagemanager';
import ConfigManager from '../tools/configmanager';
import StateManager from '../tools/state/statemanager';

class GirafeHTMLElement extends HTMLElement {

  templateUrl = null;
  styleUrl = null;
  template = null;
  component = null;

  messageManager = null;
  configManager = null;
  stateManager = null;
  
  get state() {
    return this.stateManager.state;
  }

  constructor(component) {
    super();
    this.component = component;

    this.configManager = ConfigManager.getInstance();
    this.messageManager = MessageManager.getInstance();
    this.stateManager = StateManager.getInstance();

    this.shadow = this.attachShadow({mode: 'open'});

    this.stateManager.subscribe('language', (oldLanguage, newLanguage) => this.translate());
  }

  async loadConfig() {
    await this.configManager.loadConfig();
  }

  translate() {
    I18nManager.getInstance().translate(this.shadow);
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

  activateTooltips(arrow, delay, defaultPlacement) {
    const elementsWithTooltip = Array.from(this.shadow.querySelectorAll('[tip]'));
    elementsWithTooltip.forEach(el => {
      let placement = defaultPlacement;
      if (el.hasAttribute('tip-placement')) {
        placement = el.getAttribute('tip-placement');
      }
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

  render() {
    uRender(this.shadow, this.template);
  }

  hide() {
    this.getRootNode().host.style.display = 'none';
  }
}

export default GirafeHTMLElement;