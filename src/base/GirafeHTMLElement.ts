import { render as uRender, html as uHtml, Hole } from 'uhtml';
import tippy from 'tippy.js';
import I18nManager from '../tools/i18nmanager';
import MessageManager from '../tools/messagemanager';
import ConfigManager from '../tools/configuration/configmanager';
import StateManager from '../tools/state/statemanager';
import ComponentManager from '../tools/state/componentManager';

type TippyType = typeof tippy;

class GirafeHTMLElement extends HTMLElement {
  templateUrl: string | null = null;
  styleUrl: string | null = null;
  template?: Hole | (() => Hole);
  name: string;
  shadow: ShadowRoot;
  displayStyle?: string;

  activeTooltips: TippyType[] = [];

  messageManager: MessageManager;
  configManager: ConfigManager;
  stateManager: StateManager;
  componentManager: ComponentManager;

  private unsafeCache = new Map<string, TemplateStringsArray>();

  get state() {
    return this.stateManager.state;
  }

  constructor(name: string) {
    super();
    this.name = name;

    this.configManager = ConfigManager.getInstance();
    this.messageManager = MessageManager.getInstance();
    this.stateManager = StateManager.getInstance();
    this.componentManager = ComponentManager.getInstance();
    this.componentManager.registerComponent(this);

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

  /**
   * Render the component's template.
   */
  render() {
    if (this.template) {
      this.defineDisplayStyle();
      this.show();
      uRender(this.shadow, this.template);
    } else {
      console.warn(`Cannot render: no template has been defined for component ${this.name}.`);
    }
  }

  /**
   * Convert the string in parameter with uHtml and return it.
   * This allows to convert a string with html in a right html object.
   * For example, htmlUnsafe('<div></div>') will return an html div object.
   */
  htmlUnsafe(str: string) {
    // NOTE REG: If this method is used much more in the future, we will have to take care of memory leaks
    // see discussion here: https://github.com/WebReflection/uhtml/issues/126
    const template = this.getUnsafeTemplate(str);
    return uHtml(template);
  }

  /**
   * Convert a string to TemplateStringsArray
   * Manage a cache of all the created objects to limit memory usage
   */
  private getUnsafeTemplate(str: string): TemplateStringsArray {
    let template = this.unsafeCache.get(str);
    if (!template) {
      template = [str] as unknown as TemplateStringsArray;
      this.unsafeCache.set(str, template);
    }
    return template;
  }

  /**
   * Renders a hidden span with the name of the component.
   * Useful to render a placeholder for not visible component.
   */
  renderEmpty() {
    this.defineDisplayStyle();
    this.hide();
    uRender(this.shadow, uHtml`<span style="display: none">${this.name}</span>`);
  }

  /**
   * Remember the initial display configuration of the component
   * To be able to restore it
   */
  private defineDisplayStyle() {
    if (!this.displayStyle) {
      // Remember the initial display style
      this.displayStyle = getComputedStyle(this).display ?? 'block';
      if (this.displayStyle === 'none') {
        this.displayStyle = 'block';
      }
    }
  }

  /**
   * Hide the component (display: none).
   */
  hide() {
    this.style.display = 'none';
  }

  /**
   * Show the component (display: block).
   */
  show() {
    if (this.displayStyle) {
      this.style.display = this.displayStyle;
    }
  }

  /**
   * Returns the serialization of the current element. This method should be
   * overwritten by child classes
   * @returns An object describing the current element serialized
   */
  serialize() {
    return {};
  }

  /**
   * Deserialize an element and set the current element state to the deserialized one
   * @param _serializedElement The element serialization as returned by the serialize method
   */
  deserialize(_serializedElement: unknown) {}
}

export default GirafeHTMLElement;
