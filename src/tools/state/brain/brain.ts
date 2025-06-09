import areEqual from './equality';
import {
  deepClone,
  deepFreeze,
  isFunction,
  isIgnoredProperty,
  isIterator,
  isPrimitive,
  isTypeSupported,
  isVirtualProperty
} from './tools';

declare global {
  interface Object {
    __brainIsProxy?: boolean;
    __brainTarget: object;
    __brainParents: TProxy[];
    __brainChildren: Map<string, TProxy>;
    __brainFullPaths: string[];
  }
}

type CallbackInfos = Map<string, { oldValue: TTarget; newValue: TTarget | TProxy; parents: TProxy[] }>;

export type TProxy = InstanceType<typeof Proxy>;
type TTarget = any; // NOSONAR: We want a specifix type here
type Callback = (path: string, oldValue: TTarget, newValue: TTarget | TProxy, parents: TProxy[]) => void;

export default class Brain<T> {
  private readonly initialState: object;
  private readonly stateProxy: TProxy;
  private readonly externalCallback: Callback;
  private readonly targetToProxy = new WeakMap<TTarget, TProxy>();
  private readonly proxyToTarget = new WeakMap<TProxy, TTarget>();
  private readonly proxyChildren = new WeakMap<TProxy, Map<string, TProxy>>();
  private readonly proxyParents = new WeakMap<TProxy, TProxy[]>();
  private readonly proxyToFullPaths = new WeakMap<TProxy, string[]>();

  private delayed = false;
  private readonly delayedCallbacks: CallbackInfos = new Map();

  constructor(initialState: TTarget, callback: Callback) {
    this.initialState = initialState;
    this.stateProxy = this.createProxy(this.initialState, '');
    this.externalCallback = callback;
  }

  private callback(path: string, oldValue: TTarget, newValue: TTarget | TProxy, parents: TProxy[]) {
    if (!this.delayed) {
      // Immediate Callback
      this.externalCallback(path, oldValue, newValue, parents);
    } else {
      // Remember all callback infos
      const infos = this.delayedCallbacks.get(path);
      if (!infos) {
        this.delayedCallbacks.set(path, { oldValue: oldValue, newValue: newValue, parents: parents });
      } else {
        // Just set the new value
        infos.newValue = newValue;
      }
    }
  }

  private createProxy(target: any, prop: string, parent?: TProxy) {
    const proxy = new Proxy(target, this.objectHandler());
    this.targetToProxy.set(target, proxy);
    this.proxyToTarget.set(proxy, target);

    this.proxyChildren.set(proxy, new Map());
    if (parent) {
      this.proxyParents.set(proxy, [parent]);
      this.proxyChildren.get(parent)!.set(prop, proxy);
      const paths = parent.__brainFullPaths.map((path) => this.getFullPath(path, prop));
      this.proxyToFullPaths.set(proxy, paths);
    } else {
      // Root element
      this.proxyToFullPaths.set(proxy, ['']);
    }

    return proxy;
  }

  private getOrCreateProxyForValue(proxy: object, prop: string, value: any, childPaths: string[]): TProxy | undefined {
    if (isPrimitive(value)) {
      // No proxy for primitives
      return undefined;
    }

    let valueProxy = this.targetToProxy.get(value);
    if (valueProxy) {
      // Proxy already exists
      if (valueProxy.__brainChildren.size === 0) {
        // Has not children yet, it means this proxy is not used in another place yet
        // This is no circular reference, we can process with the normal workflow
        // Otherwise, we just keep the existing infos and do not add any new child, parent or path
        proxy.__brainChildren.set(prop, valueProxy);
        const fullPaths = valueProxy.__brainFullPaths;
        for (const childPath of childPaths) {
          if (!fullPaths.includes(childPath)) {
            fullPaths.push(childPath);
          }
        }
        // TODO REG : We have to update the child paths recursively too !!
        const parents = valueProxy.__brainParents;
        if (!parents.includes(proxy)) {
          parents.push(proxy);
        }
      }
    } else {
      // Create a new proxy
      valueProxy = this.createProxy(value, prop, proxy);
    }
    return valueProxy;
  }

  private cleanProxyForValue(proxy: object, prop: string, value: any, childPaths: string[]) {
    if (isPrimitive(value)) {
      // No proxy for primitives
      return;
    }

    let valueProxy = this.targetToProxy.get(value);
    if (!valueProxy) {
      // Nothing to clean
      return;
    }

    proxy.__brainChildren.delete(prop);
    const fullPaths = valueProxy.__brainFullPaths;
    for (const childPath of childPaths) {
      const index = fullPaths.indexOf(childPath);
      if (index >= 0) {
        fullPaths.splice(index, 1);
      }
    }
    // TODO REG : We have to update the child paths recursively too !!
    const parents = valueProxy.__brainParents;
    const index = parents.indexOf(proxy);
    if (index >= 0) {
      // TODO Remove only if another child at the same level does not have it as parent
      parents.splice(index, 1);
    }
  }

  private handleGetVirtualProperties(proxy: TProxy, target: any, prop: string) {
    switch (prop) {
      case '__brainIsProxy':
        return true;
      case '__brainTarget':
        return target;
      case '__brainParents':
        return this.proxyParents.get(proxy);
      case '__brainChildren':
        return this.proxyChildren.get(proxy);
      case '__brainFullPaths':
        return this.proxyToFullPaths.get(proxy) ?? [];
    }

    throw new Error(`Unknown virtual property: ${prop}`);
  }

  private handleGetIgnored(target: any, prop: string | symbol) {
    const value = target[prop];

    if (typeof prop === 'symbol' || prop.startsWith('_')) {
      return value;
    }

    throw new Error(`Unknown ignored property: ${prop}`);
  }

  private handleGetFunctions(proxy: TProxy, target: any, func: string) {
    return (...args: unknown[]) => {
      // args can contain a callback for func likes filter, map, reduce, forEach, ...
      if (args.length === 1 && isFunction(args[0])) {
        const originalCallback = args[0];
        args[0] = (...cbArgs: any[]) => {
          // We want to be able to use proxies in the callback
          cbArgs = cbArgs.map((arg) => this.targetToProxy.get(arg) ?? arg);
          return originalCallback(...cbArgs);
        };
      } else {
        // If args contains some proxies, we replace them with the target objects
        args = args.map((arg: any) => (arg.__brainIsProxy ? arg.__brainTarget : arg));
      }

      const oldValue = deepClone(target);
      deepFreeze(oldValue);
      let result = target[func](...args);

      if (result instanceof Promise) {
        throw new Error('Promises are not supported yet.');
      }

      if (Array.isArray(result)) {
        // Get proxied results
        result = result.map((r) => this.targetToProxy.get(r) ?? r);
      } else if (isIterator(result)) {
        // Iterator
        const self = this;
        const originalIterator = result;
        result = {
          [Symbol.iterator]() {
            return {
              next() {
                const nextVal = originalIterator.next();
                if (nextVal.done) {
                  return nextVal;
                }
                return {
                  done: false,
                  // Get proxied results
                  value: self.targetToProxy.get(nextVal.value) ?? nextVal.value
                };
              }
            };
          }
        };
      } else {
        // Unique result
        result = this.targetToProxy.get(result) ?? result;
      }

      if (!areEqual(oldValue, target)) {
        for (const path of proxy.__brainFullPaths) {
          this.callback(path, oldValue, proxy, proxy.__brainParents);
        }
      }

      return result;
    };
  }

  private getHandler(proxy: TProxy, target: TTarget, prop: string | symbol) {
    if (isIgnoredProperty(prop)) {
      return this.handleGetIgnored(target, prop);
    }

    if (isVirtualProperty(prop as string)) {
      return this.handleGetVirtualProperties(proxy, target, prop as string);
    }

    const value = target[prop];
    if (isPrimitive(value)) {
      // No proxy for primitives
      return value;
    }

    if (!isTypeSupported(value)) {
      throw new Error(`The type of the property ${prop as string} is not supported.`);
    }

    if (isFunction(value)) {
      if (Array.isArray(target)) {
        // Create proxies for all children
        for (const i in target) {
          const childPaths = proxy.__brainFullPaths.map((path) => this.getFullPath(path, i));
          this.getOrCreateProxyForValue(proxy, i, target[i], childPaths);
        }
      }
      return this.handleGetFunctions(proxy, target, prop as string);
    }

    const childPaths = proxy.__brainFullPaths.map((path) => this.getFullPath(path, prop as string));
    const childProxy = this.getOrCreateProxyForValue(proxy, prop as string, value, childPaths);
    return childProxy;
  }

  private setHandler(proxy: TProxy, target: TTarget, prop: string | symbol, newValue: TTarget | TProxy): boolean {
    try {
      let newValueProxy;
      if (newValue?.__brainIsProxy) {
        newValueProxy = newValue;
        newValue = newValueProxy.__brainTarget;
      }

      if (isFunction(newValue)) {
        // For functions, just set the property, there is nothing else to do.
        target[prop as string] = newValue;
        return true;
      }

      // Clean proxies
      let oldValue = target[prop];
      const childPaths = proxy.__brainFullPaths.map((path) => this.getFullPath(path, prop as string));
      this.cleanProxyForValue(proxy, prop as string, oldValue, childPaths);

      if (isIgnoredProperty(prop)) {
        // Ignored => No callback and no clone of the old version
        // Just set the new value
        target[prop as string] = newValue;
        return true;
      }

      // Create frozen clone as oldValue
      oldValue = deepClone(oldValue);
      deepFreeze(oldValue);
      target[prop as string] = newValue;

      if (!isTypeSupported(newValue)) {
        throw new Error(`The type of the property ${prop as string} is not supported.`);
      }

      if (areEqual(oldValue, newValue)) {
        // No change => No callback
        return true;
      }

      // Call callbacks
      newValueProxy = this.getOrCreateProxyForValue(proxy, prop as string, newValue, childPaths);
      for (const childPath of childPaths) {
        this.callback(childPath, oldValue, newValueProxy ?? newValue, [proxy]);
      }

      return true;
    } catch (error) {
      console.error(`Cannot set ${prop as string} on ${target} : ${error}`);
      return false;
    }
  }

  private setArrayHandler(proxy: TProxy, target: TTarget, prop: string | symbol, newValue: TTarget | TProxy): boolean {
    try {
      if (!Array.isArray(target)) {
        throw new Error('This method should only be called on arrays');
      }

      if (newValue?.__brainIsProxy) {
        newValue = newValue.__brainTarget;
      }

      if (isFunction(Reflect.get(target, prop)) || isFunction(newValue)) {
        throw new Error('Setting functions is not supported.');
      }

      const oldTarget = deepClone(target);
      deepFreeze(oldTarget);
      Reflect.set(target, prop, newValue);

      if (areEqual(oldTarget, target)) {
        // No change => No callback
        return true;
      }

      // Call callbacks
      const childPaths = proxy.__brainFullPaths.map((path) => this.getFullPath(path, prop as string));
      this.getOrCreateProxyForValue(proxy, prop as string, newValue, childPaths);
      for (const childPath of proxy.__brainFullPaths) {
        this.callback(childPath, oldTarget, proxy, proxy.__brainParents);
      }

      return true;
    } catch (error) {
      console.error(`Cannot set ${prop as string} on ${target} : ${error}`);
      return false;
    }
  }

  private getFullPath(parentPath: string, prop: string): string {
    if (parentPath.trim().length > 0) {
      return `${parentPath}.${prop}`;
    }
    return prop;
  }

  private readonly objectHandler = (): ProxyHandler<any> => ({
    get: (target, prop, _receiver) => {
      const proxy = this.targetToProxy.get(target)!;
      return this.getHandler(proxy, target, prop);
    },
    set: (target, prop, newValue, _receiver) => {
      const proxy = this.targetToProxy.get(target)!;
      if (Array.isArray(target)) {
        return this.setArrayHandler(proxy, target, prop, newValue);
      }
      return this.setHandler(proxy, target, prop, newValue);
    }
  });

  public delay(statechanges: (state: T) => void) {
    this.delayed = true;
    try {
      // Execute state changes
      statechanges(this.stateProxy as T);
    } finally {
      this.delayed = false;
      // Call all callbacks
      this.delayedCallbacks.forEach((infos, key) => {
        this.externalCallback(key, infos.oldValue, infos.newValue, infos.parents);
      });

      this.delayedCallbacks.clear();
    }
  }

  public getState(): T {
    return this.stateProxy as T;
  }
}
