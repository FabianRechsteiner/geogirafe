// SPDX-License-Identifier: Apache-2.0
import { render as uRender, html as uHtml, Hole } from 'uhtml';
import { Callback } from '../tools/state/statemanager';
import { GgUserInteractionEvent } from '../tools/state/userinteractionevent';
import IGirafeContext from '../tools/context/icontext';

abstract class GirafeHTMLElement extends HTMLElement {
  protected templateUrl: string | null = null;
  protected styleUrl: string | null = null;
  protected styleUrls: string[] | null = null;
  protected template!: Hole | (() => Hole);
  public readonly name: string;
  protected shadow: ShadowRoot;
  private displayStyle?: string;
  private timeoutId?: NodeJS.Timeout;
  protected rendered: boolean = false;

  private readonly callbacks: Callback[] = [];

  private readonly unsafeCache = new Map<string, TemplateStringsArray>();
  private _context?: IGirafeContext;

  protected get context(): IGirafeContext {
    if (!this._context) {
      throw new Error('No context !!!');
    }
    return this._context;
  }

  public constructor(name: string, context?: IGirafeContext) {
    super();
    this.name = name;
    if (context) {
      this._context = context;
    }
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  protected get state() {
    return this.context.stateManager.state;
  }

  protected getById<T = HTMLElement>(id: string) {
    return this.shadow.getElementById(id) as T;
  }

  protected getChildElement<T = HTMLElement>(selector: string) {
    return this.shadow.querySelector(selector) as T;
  }

  protected girafeTranslate() {
    this.context.i18nManager.translate(this.shadow);
  }

  private userInfoChanged() {
    this.context.pluginManager.filterPlugins(this.shadow);
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
  protected isNullOrUndefined(val: unknown): boolean {
    return val === undefined || val === null;
  }

  protected isNullOrUndefinedOrBlank(val: unknown): boolean {
    return val === undefined || val === null || val === '';
  }

  protected getParentOfType(parentNodeName: string, elem: Node | null, initialElem: Node | null = elem): Node | null {
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
  protected render() {
    // TODO REG : Reactivate this check and fix all the code.
    /*if (this.rendered) {
      throw Error('Component already rendered. Please call refreshRender() instead.');
    }*/

    if (this.template) {
      this.defineDisplayStyle();
      this.show();
      uRender(this.shadow, this.template);
      this.rendered = true;
      this.userInfoChanged();
    } else {
      console.warn(`Cannot render: no template has been defined for component ${this.name}.`);
    }
  }

  /**
   * Re-Render the component.
   * The method should be called when the component
   * has already been rendered and needs to be updated.
   */
  protected refreshRender() {
    if (!this.rendered) {
      throw Error('Component cannot be re-rendered. Please call render() first.');
    }

    // Call to uRender MUST stay synchron (no timeout)
    // Otherwise, this cause unwanted effects like delay when updating templates
    uRender(this.shadow, this.template);

    // Use a debouncing to prevent multiple execution of this method
    // If multiple refresh at the same time are called.
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.girafeTranslate();
      this.userInfoChanged();
    });
  }

  /**
   * Renders a hidden span with the name of the component.
   * Useful to render a placeholder for not visible component.
   */
  protected renderEmpty() {
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
  protected htmlUnsafe(str: string) {
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
  protected simulateClick(e: KeyboardEvent) {
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
  protected hide() {
    this.style.display = 'none';
    this.unregisterInteractionListeners();
  }

  /**
   * Show the component (display: block).
   */
  protected show() {
    if (this.displayStyle) {
      this.style.display = this.displayStyle;
    }
  }

  /**
   * Subscribes with <callback> to the state changes made on <path>
   */
  protected subscribe(path: string, callback: Callback): Callback;
  protected subscribe(path: RegExp, callback: Callback): Callback;
  protected subscribe(path: string | RegExp, callback: Callback): Callback {
    // @ts-expect-error The call would have succeeded against this implementation,
    // but implementation signatures of overloads are not externally visible.
    const subscription = this.context.stateManager.subscribe(path, callback);
    this.callbacks.push(subscription);
    return subscription;
  }

  /**
   *
   * @param callback Unsubscribe all callbacks
   */
  protected unsubscribe(callback: Callback): void;
  protected unsubscribe(callbacks: Callback[]): void;
  protected unsubscribe(callbacks: Callback | Callback[]): void {
    (Array.isArray(callbacks) ? callbacks : [callbacks]).forEach((callback) => {
      const index = this.callbacks.findIndex((c) => c === callback);
      if (index >= 0) {
        this.context.stateManager.unsubscribe(callback);
        this.callbacks.splice(index, 1);
      }
    });
  }

  protected connectedCallback() {
    this._context = this.getInheritedContext();
    this.context.componentManager.registerComponent(this);
    this.subscribe('language', () => this.girafeTranslate());
    this.subscribe('oauth.userInfo', () => this.userInfoChanged());
  }

  /**
   * When the component is disconnected from the DOM
   * all the callbacks will be unregistered
   */
  protected disconnectedCallback() {
    for (const callback of this.callbacks) {
      this.context.stateManager.unsubscribe(callback);
    }
    this.callbacks.length = 0;
    this.unregisterInteractionListeners();
  }

  protected registerInteractionListener(eventName: GgUserInteractionEvent, isExclusive: boolean): boolean {
    return this.context.userInteractionManager.registerListener(eventName, isExclusive, this.name);
  }

  protected unregisterInteractionListeners(eventNames?: GgUserInteractionEvent | GgUserInteractionEvent[]): void {
    if (!eventNames) {
      this.context.userInteractionManager.unregisterAllListenersOfTool(this.name);
    }
    if (!Array.isArray(eventNames)) {
      eventNames = [eventNames!];
    }
    for (const event of eventNames) {
      this.context.userInteractionManager.unregisterListener(event, this.name);
    }
  }

  protected canExecute(eventName: GgUserInteractionEvent) {
    return this.context.userInteractionManager.canListenerExecute(eventName, this.name);
  }

  protected getInheritedContext(): IGirafeContext {
    if (this._context) {
      // The context was already initialized in the constructor
      return this._context;
    }

    let parent = this.parentNode;
    do {
      if (parent instanceof ShadowRoot) {
        parent = parent.host;
      }
      if (parent instanceof GirafeHTMLElement) {
        return parent.context;
      }
      parent = parent?.parentNode ?? null;
    } while (parent && parent !== document);
    if (parent === document) {
      return (parent as Document).geogirafe.context;
    }

    throw new Error('No context was found !');
  }
}

export default GirafeHTMLElement;
