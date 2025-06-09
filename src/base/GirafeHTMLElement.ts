import { render as uRender, html as uHtml, Hole } from 'uhtml';
import I18nManager from '../tools/i18n/i18nmanager';
import ConfigManager from '../tools/configuration/configmanager';
import StateManager, { Callback } from '../tools/state/statemanager';
import ComponentManager from '../tools/state/componentManager';
import UserInteractionManager from '../tools/state/userInteractionManager';
import { GgUserInteractionEvent } from '../tools/state/userinteractionevent';

class GirafeHTMLElement extends HTMLElement {
  templateUrl: string | null = null;
  styleUrl: string | null = null;
  template!: Hole | (() => Hole);
  name: string;
  shadow: ShadowRoot;
  displayStyle?: string;
  timeoutId?: NodeJS.Timeout;
  rendered: boolean = false;

  callbacks: Callback[] = [];

  configManager: ConfigManager;
  stateManager: StateManager;
  componentManager: ComponentManager;
  userInteractionManager: UserInteractionManager;

  private readonly unsafeCache = new Map<string, TemplateStringsArray>();

  constructor(name: string) {
    super();
    this.name = name;

    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();
    this.componentManager = ComponentManager.getInstance();
    this.userInteractionManager = UserInteractionManager.getInstance();
    this.componentManager.registerComponent(this);

    this.shadow = this.attachShadow({ mode: 'open' });

    this.subscribe('language', (_oldLanguage: string, _newLanguage: string) => this.girafeTranslate());
  }

  get state() {
    return this.stateManager.state;
  }

  getById<T = HTMLElement>(id: string) {
    return this.shadow.querySelector('#' + id)! as T;
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

  getParentOfType(parentNodeName: string, elem: Node | null, initialElem: Node | null = elem): Node | null {
    // Stop case : we found null or an object of the right type
    if (elem === null || (elem !== initialElem && elem.nodeName === parentNodeName)) {
      return elem;
    }

    // Otherwise, we try to find a parent recursively
    let parent: ParentNode | null = null;
    if (elem instanceof ShadowRoot) {
      parent = elem.host;
    } else {
      parent = elem.parentNode;
    }

    return this.getParentOfType(parentNodeName, parent, elem);
  }

  /**
   * Render the component's template.
   */
  render() {
    // TODO REG : Reactivate this check and fix all the code.
    /*if (this.rendered) {
      throw Error('Component already rendered. Please call refreshRender() instead.');
    }*/

    if (this.template) {
      this.defineDisplayStyle();
      this.show();
      uRender(this.shadow, this.template);
      this.rendered = true;
    } else {
      console.warn(`Cannot render: no template has been defined for component ${this.name}.`);
    }
  }

  /**
   * Re-Render the component.
   * The method should be called when the component
   * has already been rendered and needs to be updated.
   */
  refreshRender() {
    if (!this.rendered) {
      throw Error('Component cannot be re-rendered. Please call render() first.');
    }

    // Use a debouncing to prevent multiple execution of this method
    // If multiple refresh at the same time are called.
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      uRender(this.shadow, this.template);
      this.girafeTranslate();
    });
  }

  /**
   * Renders a hidden span with the name of the component.
   * Useful to render a placeholder for not visible component.
   */
  renderEmpty() {
    this.defineDisplayStyle();
    this.hide();
    uRender(this.shadow, uHtml`<span style="display: none">${this.name}</span>`);
    this.rendered = false;
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
   * In the templates, sometimes for accessibility reasons, we have to support the KeyDown Event
   * In those case, we often juste want to do the same as the click event when Enter or Space is pressed
   * Then this method can be used : it just calls the click event on the same element
   */
  simulateClick(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      if (target) {
        target.click();
      }
    }
  }

  /**
   * Hide the component (display: none).
   */
  hide() {
    this.style.display = 'none';
    this.unregisterInteractionListeners();
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

  /**
   * Subscribes with <callback> to the state changes made on <path>
   */
  subscribe(path: string, callback: Callback): Callback;
  subscribe(path: RegExp, callback: Callback): Callback;
  subscribe(path: string | RegExp, callback: Callback): Callback {
    // @ts-expect-error The call would have succeeded against this implementation,
    // but implementation signatures of overloads are not externally visible.
    const subscription = this.stateManager.subscribe(path, callback);
    this.callbacks.push(subscription);
    return subscription;
  }

  /**
   *
   * @param callback Unsubscribe all callbacks
   */
  unsubscribe(callback: Callback): void;
  unsubscribe(callbacks: Callback[]): void;
  unsubscribe(callbacks: Callback | Callback[]): void {
    (Array.isArray(callbacks) ? callbacks : [callbacks]).forEach((callback) => {
      const index = this.callbacks.findIndex((c) => c === callback);
      if (index >= 0) {
        this.stateManager.unsubscribe(callback);
        this.callbacks.splice(index, 1);
      }
    });
  }

  /**
   * When the component is disconnected from the DOM
   * all the callbacks will be unregistered
   */
  disconnectedCallback() {
    for (const callback of this.callbacks) {
      this.stateManager.unsubscribe(callback);
    }
    this.callbacks.length = 0;
    this.unregisterInteractionListeners();
  }

  registerInteractionListener(eventName: GgUserInteractionEvent, isExclusive: boolean): boolean {
    return this.userInteractionManager.registerListener(eventName, isExclusive, this.name);
  }

  unregisterInteractionListeners(eventNames?: GgUserInteractionEvent | GgUserInteractionEvent[]): void {
    if (!eventNames) {
      this.userInteractionManager.unregisterAllListenersOfTool(this.name);
    }
    if (!Array.isArray(eventNames)) {
      eventNames = [eventNames!];
    }
    eventNames.forEach((event) => this.userInteractionManager.unregisterListener(event, this.name));
  }

  canExecute(eventName: GgUserInteractionEvent) {
    return this.userInteractionManager.canListenerExecute(eventName, this.name);
  }
}

export default GirafeHTMLElement;
