import { render as uRender } from 'uhtml';
import { Renderable } from '../typings/uhtml';
import tippy from 'tippy.js';
import { Placement, Content } from 'tippy.js';
import I18nManager from '../tools/i18nmanager';
import MessageManager from '../tools/messagemanager';
import ConfigManager from '../tools/configmanager';
import StateManager from '../tools/state/statemanager';

class GirafeHTMLElement extends HTMLElement {

  templateUrl: string | null = null;
  styleUrl: string | null = null;
  template?: Renderable | (() => Renderable);
  component: string;
  shadow: ShadowRoot;

  messageManager: MessageManager;
  configManager: ConfigManager;
  stateManager: StateManager;
  
  get state() {
    return this.stateManager.state;
  }

  constructor(component: string) {
    super();
    this.component = component;

    this.configManager = ConfigManager.getInstance();
    this.messageManager = MessageManager.getInstance();
    this.stateManager = StateManager.getInstance();

    this.shadow = this.attachShadow({mode: 'open'});

    this.stateManager.subscribe('language', (_oldLanguage: string, _newLanguage: string) => this.girafeTranslate());
  }

  async loadConfig() {
    await this.configManager.loadConfig();
  }

  girafeTranslate() {
    I18nManager.getInstance().translate(this.shadow);
  }

  /**
   * TODO: Why not use truthy?
   * @param val 
   * @returns 
   */
  isNullOrUndefined(val: any): boolean {
    return (val === undefined || val === null);
  }

  isNullOrUndefinedOrBlank(val: any): boolean {
    return (val === undefined || val === null || val === '');
  }

  delayed(functionToWatch: Function, functionToExecute: Function) {
    const observer = new MutationObserver((_mutations, obs) => {
      if (functionToWatch()) {
        functionToExecute();
        obs.disconnect();
      }
    });
    
    observer.observe(this.shadow, { childList: true, subtree: true });
  }

  getParentOfType(parentNodeName: string, elem: Node | null): Node | null {
    // Stop case : we found null or an object of the right type
    if (elem === null || elem.nodeName === parentNodeName) {
      return elem;
    }

    // Otherwise, we try to find a parent recursively
    let parent: ParentNode | null = null;
    if (elem instanceof ShadowRoot) {
      parent = elem.host;
    }
    else {
      parent = elem.parentNode;
    }

    return this.getParentOfType(parentNodeName, parent);
  }

  activateTooltips(arrow: boolean, delay: [number, number], defaultPlacement: Placement) {
    const elementsWithTooltip = Array.from(this.shadow.querySelectorAll('[tip]'));
    elementsWithTooltip.forEach(el => {
      let placement = el.getAttribute('tip-placement') as Placement || defaultPlacement ;
      tippy(el, {
        arrow: arrow,
        delay: delay,
        placement: placement,
        //animateFill: false,
        //animation: 'scale-with-inertia',
        content: el.getAttribute('tip') as Content
      })
    });
  }

  render() {
    uRender(this.shadow, this.template);
  }

  hide() {
    this.style.display = 'none';
  }
}

export default GirafeHTMLElement;
