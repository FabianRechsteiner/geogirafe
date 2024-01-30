import { render as uRender } from 'uhtml';
import { Renderable } from '../typings/uhtml';
import tippy from 'tippy.js';
import I18nManager from '../tools/i18nmanager';
import MessageManager from '../tools/messagemanager';
import ConfigManager from '../tools/configmanager';
import StateManager from '../tools/state/statemanager';

type TippyType = typeof tippy;

class GirafeHTMLElement extends HTMLElement {
  templateUrl: string | null = null;
  styleUrl: string | null = null;
  template?: Renderable | (() => Renderable);
  component: string;
  shadow: ShadowRoot;

  activeTooltips: TippyType[] = [];

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

    this.shadow = this.attachShadow({ mode: 'open' });

    this.stateManager.subscribe('language', (_oldLanguage: string, _newLanguage: string) => this.girafeTranslate());
  }

  async loadConfig() {
    await this.configManager.loadConfig();
  }

  girafeTranslate() {
    I18nManager.getInstance().translate(this.shadow);
  }

  /**
   * NOTE REG: We cannot just use truthy here, because javascript comparaison table is really problematic.
   * For example:
   *   0  == false
   *   [] == false
   *   "" == false
   * And there are cases where we want to check null or undefined, because 0 can be a right value.
   * More here : https://dorey.github.io/JavaScript-Equality-Table/
   * @param val
   * @returns
   */
  isNullOrUndefined(val: unknown): boolean {
    return val === undefined || val === null;
  }

  isNullOrUndefinedOrBlank(val: unknown): boolean {
    return val === undefined || val === null || val === '';
  }

  delayed(functionToWatch: () => boolean, functionToExecute: () => void) {
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
    } else {
      parent = elem.parentNode;
    }

    return this.getParentOfType(parentNodeName, parent);
  }

  activateTooltips(arrow: boolean, delay: [number, number], defaultPlacement: string) {
    // First, deactivate all existing tooltips
    for (const tooltip of this.activeTooltips) {
      tooltip.destroy();
    }
    this.activeTooltips = [];

    const elementsWithTooltip = Array.from(this.shadow.querySelectorAll('[tip]'));
    elementsWithTooltip.forEach((el) => {
      const tooltipText = el.getAttribute('tip');
      if (tooltipText !== '') {
        const placement = el.getAttribute('tip-placement') ?? defaultPlacement;
        const theme = el.getAttribute('tip-theme') ?? '';
        const tooltip = tippy(el, {
          arrow: arrow,
          delay: delay,
          placement: placement,
          theme: theme,
          //animateFill: false,
          //animation: 'scale-with-inertia',
          content: el.getAttribute('tip')
        });
        this.activeTooltips.push(tooltip);
      }
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
