import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import GirafeSingleton from '../../base/GirafeSingleton';

type Callback = (elem: GirafeHTMLElement) => unknown;
type Constructor<T> = new (...args: unknown[]) => T;

export default class ComponentManager extends GirafeSingleton {
  private components: { [tagName: string]: GirafeHTMLElement[] } = {};
  private registeredCallbacks: Callback[][] = [];
  private registeredCallbacksClasses: Constructor<GirafeHTMLElement>[] = [];

  public registerComponent(component: GirafeHTMLElement) {
    if (this.components[component.name] == undefined) {
      this.components[component.name] = [];
    }
    this.components[component.name].push(component);

    for (let i = 0; i < this.registeredCallbacksClasses.length; i++) {
      if (component instanceof this.registeredCallbacksClasses[i]) {
        this.registeredCallbacks[i].forEach((callback) => callback(component));
      }
    }
  }

  public getComponents<T extends GirafeHTMLElement>(type: Constructor<T>): T[] {
    return Object.values(this.components)
      .flat()
      .filter((c) => c instanceof type) as T[];
  }

  public getComponentsByName(name: string) {
    return this.components[name];
  }
}
