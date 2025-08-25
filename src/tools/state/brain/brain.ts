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

  /**
   *
   * Creates a proxy for the given target object
   * @param target The target object to create a proxy for
   * @param prop The property name of this target in its parent
   * @param parent The parent proxy (optional for root element)
   * @returns The created proxy
   */
  private createProxy(target: any, prop: string, parent?: TProxy): TProxy {
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

  /**
   * Ensure we keep only minimal unique paths for a proxy.
   * And ensure that the selectd paths have the same prefix than the parents path
   * Example:
   *   existing:    ["group"]
   *   candidates:  ["group.children.0.parent"]
   *   => keep only ["group"]
   * Other example if parentsPaths is defined:
   *   existing:    ["group.inner"]
   *   candidates:  ["group.inner", "group2.inner"]
   *   parrents:    ["group2"]
   *   => keep only ["group2.inner"] (Because it is the only one still linked to the right parent)
   */
  private mergeMinimalPaths(existingPaths: string[], candidatePaths: string[], parents: TProxy[]): string[] {
    const minimalPaths = new Set<string>();

    for (const candidate of [...existingPaths, ...candidatePaths]) {
      // Already present
      if (minimalPaths.has(candidate)) {
        continue;
      }

      // If the candidate hat a minimal path as prefix
      if ([...minimalPaths].some((path) => candidate.startsWith(`${path}.`))) {
        continue;
      }

      // If not prefixed by any parent
      if (!this.isRightParent(candidate, parents)) {
        continue;
      }

      minimalPaths.add(candidate);
    }

    return Array.from(minimalPaths);
  }

  private isRightParent(candidate: string, parents: TProxy[]): boolean {
    const parentsPaths = parents?.flatMap((p) => p.__brainFullPaths);
    if (parentsPaths?.length > 0 && parentsPaths[0].length > 0) {
      // Not on the root
      let circularReference = false;
      let rightParent = false;
      for (const parentPath of parentsPaths) {
        if (parentPath.includes(`${candidate}.`)) {
          circularReference = true;
          break;
        } else if (candidate.startsWith(`${parentPath}.`)) {
          rightParent = true;
          break;
        }
      }

      if (!circularReference && !rightParent) {
        return false;
      }
    }

    return true;
  }

  private getOrCreateProxyForValue(proxy: object, prop: string, value: any, childPaths: string[]): TProxy | undefined {
    if (isPrimitive(value)) {
      // No proxy for primitives
      return undefined;
    }

    let valueProxy = this.targetToProxy.get(value);
    if (valueProxy) {
      // Proxy already exists

      // Link parent to child
      proxy.__brainChildren.set(prop, valueProxy);

      // Add parent if not already present
      const parents = valueProxy.__brainParents;
      if (!parents.includes(proxy)) {
        parents.push(proxy);
      }

      // Merge full paths (ensure minimal paths)
      const merged = this.mergeMinimalPaths(valueProxy.__brainFullPaths, childPaths, valueProxy.__brainParents);
      const fullPaths = valueProxy.__brainFullPaths;
      if (merged.length !== fullPaths.length || merged.some((p: string, i: number) => p !== fullPaths[i])) {
        fullPaths.splice(0, fullPaths.length, ...merged);
      }

      this.updateChildPathsRecursively(valueProxy, fullPaths);
    } else {
      // Create a new proxy
      valueProxy = this.createProxy(value, prop, proxy);
      const minimal = this.mergeMinimalPaths([], childPaths, valueProxy.__brainParents);
      this.proxyToFullPaths.set(valueProxy, minimal);
      this.updateChildPathsRecursively(valueProxy, minimal);
    }
    return valueProxy;
  }

  private cleanProxyForValue(proxy: object, prop: string, value: any, childPaths: string[]) {
    if (isPrimitive(value)) {
      // Nothing to clean for primitives
      return;
    }

    const valueProxy = this.targetToProxy.get(value);
    if (!valueProxy) {
      // The value was never proxied => Nothing to clean
      return;
    }

    // Remove the child link for this property
    proxy.__brainChildren.delete(prop);

    // Remove only the paths that were coming from this proxy
    const fullPaths = valueProxy.__brainFullPaths;
    for (const childPath of childPaths) {
      const index = fullPaths.indexOf(childPath);
      if (index >= 0) {
        fullPaths.splice(index, 1);
      }
    }

    // Check if this proxy is still a parent of the child
    // We only remove the parent if NO other child at this level points to it.
    const parents = valueProxy.__brainParents;
    const stillReferenced = Array.from(proxy.__brainChildren.values()).includes(valueProxy);
    if (!stillReferenced) {
      const index = parents.indexOf(proxy);
      if (index >= 0) {
        parents.splice(index, 1);
      }
    }

    // Recursively update child paths for consistency
    this.updateChildPathsRecursively(valueProxy, valueProxy.__brainFullPaths);
  }

  private recalculateChildrenForArray(proxy: TProxy, target: TTarget, oldValue: TTarget) {
    if (!Array.isArray(target)) {
      throw new Error('This method is only for arrays');
    }

    // Clean previous childs
    proxy.__brainChildren.clear();

    for (let i = 0; i < target.length; ++i) {
      const childValue = target[i];
      const childPaths = proxy.__brainFullPaths.map((path) => this.getFullPath(path, i.toString()));
      const childOldValue = oldValue.find((oldChild: any) => areEqual(oldChild, childValue));
      if (childOldValue) {
        const oldChildIndex = oldValue.indexOf(childOldValue);
        const oldChildPaths = proxy.__brainFullPaths.map((path) => this.getFullPath(path, oldChildIndex));
        this.cleanProxyForValue(proxy, i.toString(), childValue, oldChildPaths);
      }
      const childProxy = this.getOrCreateProxyForValue(proxy, i.toString(), childValue, childPaths);
      if (childProxy) {
        proxy.__brainChildren.set(i.toString(), childProxy);
      }

      if (oldValue && oldValue.length > target.length) {
        for (let i = target.length; i < oldValue.length; i++) {
          const childPaths = proxy.__brainFullPaths.map((path) => this.getFullPath(path, i.toString()));
          this.cleanProxyForValue(proxy, i.toString(), oldValue[i], childPaths);
        }
      }

      for (const [key, childProxy] of proxy.__brainChildren.entries()) {
        const childPaths = proxy.__brainFullPaths.map((path) => this.getFullPath(path, key));
        this.proxyToFullPaths.set(childProxy, childPaths);
        this.updateChildPathsRecursively(childProxy, childPaths);
      }
    }
  }

  private updateChildPathsRecursively(proxy: TProxy, parentPaths: string[], visited = new Set<TProxy>()) {
    if (visited.has(proxy)) {
      return;
    }
    visited.add(proxy);

    for (const [prop, childProxy] of proxy.__brainChildren.entries()) {
      let fullPaths = this.proxyToFullPaths.get(childProxy);
      if (!fullPaths) {
        fullPaths = [];
        this.proxyToFullPaths.set(childProxy, fullPaths);
      }

      const candidatePaths = parentPaths.map((path) => this.getFullPath(path, prop));
      const merged = this.mergeMinimalPaths(fullPaths, candidatePaths, childProxy.__brainParents);
      const changed = merged.length !== fullPaths.length || merged.some((p, i) => p !== fullPaths[i]);
      if (changed) {
        fullPaths.splice(0, fullPaths.length, ...merged);
        this.updateChildPathsRecursively(childProxy, fullPaths, visited);
      }
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
        const originalIterator = result;
        result = {
          [Symbol.iterator]() {
            return {
              next: () => {
                const nextVal = originalIterator.next();
                if (nextVal.done) {
                  return nextVal;
                }
                return {
                  done: false,
                  // Get proxied results
                  value: this.targetToProxy.get(nextVal.value) ?? nextVal.value
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
        if (Array.isArray(target)) {
          // The array has changed. We have to recalculate the children and paths for the elements
          this.recalculateChildrenForArray(proxy, target, oldValue);
        }
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
