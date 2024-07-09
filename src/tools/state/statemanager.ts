/* eslint @typescript-eslint/no-explicit-any: 0 */

import GirafeSingleton from '../../base/GirafeSingleton';
import State from './state';
import ConfigManager from '../configuration/configmanager';
import onChange from 'on-change';

export type Callback = (oldValue: any, value: any, parent?: any) => void | Promise<void>;

class StateManager extends GirafeSingleton {
  #girafeState: State | null = null;
  #stateProxy: State;
  get state() {
    return this.#stateProxy;
  }

  #callbacks: Record<string, Callback[]> = {};

  configManager: ConfigManager;

  constructor(type: string) {
    super(type);

    this.configManager = ConfigManager.getInstance();

    this.#girafeState = new State();
    this.#stateProxy = onChange(
      this.#girafeState,
      (path, value, oldValue, _applyData) => {
        if (!this.areEqual(oldValue, value)) {
          console.debug(`${path} has changed.`);
          this.onChange(path, oldValue, value);
        }
      },
      {
        // Adding object in the state with a name starting by a symbol will avoid to Proxy this object
        // (The Proxy API changes the class!) and prevent to listen changes on this object.
        ignoreUnderscores: true,
        ignoreSymbols: true
      }
    );

    // Prevent extensions of the State Object.
    Object.preventExtensions(this.#girafeState);

    this.setDefaultValues();
  }

  setDefaultValues() {
    // Set default values
    this.configManager?.loadConfig().then(() => {
      const config = this.configManager?.Config;
      if (this.state && config) {
        this.state.projection = config.map.srid;
        this.state.language = config.languages.defaultLanguage;
        this.state.interface.selectionComponent = config.interface.defaultSelectionComponent;
      }
    });
  }

  onChange(property: string, oldValue: unknown, value: unknown) {
    const path = property.trim();
    for (const key in this.#callbacks) {
      const regex = new RegExp('^' + key + '$');
      if (path.match(regex)) {
        // We find the parent object and send it in the callback
        const indexOfLastPoint = path.lastIndexOf('.');
        const parentPath = path.substring(0, indexOfLastPoint);
        const childPathFromParent = path.substring(indexOfLastPoint + 1);
        const parentObject = this.getPropertyByPath(this.state, parentPath);
        if (!parentObject.found) {
          console.warn('Parent object could not be found in the state');
        } else {
          // At this point, the "value" is not the proxy, but the initial object.
          // But we want to get the proxy and to return it, because it can be used in the calling methods
          // Otherwise, the modifications made to the object won't go through the proxy, and the events won't be fired
          value = parentObject.object[childPathFromParent];
        }

        const callbacks = this.#callbacks[key];
        for (const callback of callbacks) {
          callback(oldValue, value, parentObject.object);
        }
      }
    }
  }

  subscribe(path: string, callback: Callback): Callback;
  subscribe(path: RegExp, callback: Callback): Callback;
  subscribe(path: string | RegExp, callback: Callback): Callback {
    const pathAsString = typeof path === 'string' ? path : path.source;
    if (!(pathAsString in this.#callbacks)) {
      this.#callbacks[pathAsString] = [];
    }
    this.#callbacks[pathAsString].push(callback);
    console.debug(
      `Subscribing to ${path}. ${this.#callbacks[pathAsString].length} are currently subscribing ${pathAsString}.`
    );

    // At the application start, perhaps the value in state was initialized before the subscribe method was called
    // Therefore, if the subscribed value os not null, undefined or an empty object or array
    // We immediately call the callback.
    const obj = this.getPropertyByPath(this.state, pathAsString);
    if (obj.found) {
      if (
        obj.object === null ||
        obj.object === undefined ||
        (Array.isArray(obj.object) && obj.object.length === 0) ||
        (obj.object instanceof Object && Object.keys(obj.object).length === 0)
      ) {
        // Empty object => nothing to do
      } else {
        // Object is not null during the subscribe. => we call the callback
        const parentPath = pathAsString.substring(0, pathAsString.lastIndexOf('.'));
        const parentObject = this.getPropertyByPath(this.state, parentPath);
        callback(null, obj.object, parentObject.object);
      }
    }
    return callback;
  }

  /** Unsubscribe one or multiple trackers by their callbacks.  */
  unsubscribe(callback: Callback): void;
  unsubscribe(callbacks: Callback[]): void;
  unsubscribe(callbacks: Callback | Callback[]): void {
    (Array.isArray(callbacks) ? callbacks : [callbacks]).forEach((callback) => {
      let found = false;
      for (const path in this.#callbacks) {
        const callbacks = this.#callbacks[path];
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          found = true;
          callbacks.splice(index, 1);
          console.debug(`Unsubscribing to ${path}. ${this.#callbacks[path].length} subscribtions remaining.`);
        }
      }
      if (!found) {
        throw Error(`Cannot unsubscribe this callback : it does not exist`);
      }
    });
  }

  /**
   * @returns the property or object, following the given path, and the
   * parent and last key to the parent object to be able to set it (see also setPropertyByPath).
   */
  getPropertyByPath(obj: any, path: string) {
    let currentObj = obj;
    let parentObject = null;
    let lastKey = null;
    if (path.trim() !== '') {
      const keys = path.split('.');

      for (const key of keys) {
        if (key in currentObj) {
          parentObject = currentObj;
          lastKey = key;
          currentObj = currentObj[key];
        } else {
          return { found: false, object: null, parentObject, lastKey };
        }
      }
    }

    return { found: true, object: currentObj, parentObject, lastKey };
  }

  /**
   * Sets the value of a property specified by a given path in an object.
   * @returns true if the property was set successfully, false otherwise.
   */
  setPropertyByPath(obj: any, path: string, value: any): boolean {
    const result = this.getPropertyByPath(obj, path);
    if (result.parentObject && result.lastKey) {
      result.parentObject[result.lastKey] = value;
      return true;
    }
    return false;
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value
   * @returns a replacer for a cyclic value
   */
  getCircularReplacer() {
    const visitedObjects = new WeakSet();

    return function (_key: string, value: any) {
      if (typeof value !== 'object' || value === null) {
        // The value is not an object
        // => We just return it
        return value;
      }

      if (visitedObjects.has(value)) {
        // We have found a circular reference.
        // => We replace it with a dummy string.
        return '[Circular]';
      }

      // Add the object to the list of visited objects
      visitedObjects.add(value);

      // Return the value
      return value;
    };
  }

  areEqual(obj1: any, obj2: any) {
    if (typeof obj1 === 'number' && typeof obj2 === 'number') {
      // Special case for numbers : check NaN
      if (Number.isNaN(obj1) && Number.isNaN(obj2)) {
        return true;
      }
      return obj1 === obj2;
    }

    if (
      typeof obj1 !== 'object' ||
      typeof obj2 !== 'object' ||
      obj1 === null ||
      obj2 === null ||
      obj1 === undefined ||
      obj2 === undefined
    ) {
      // Compare simple values
      return obj1 === obj2;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      // Not the same number of properties
      return false;
    }

    if (JSON.stringify(obj1, this.getCircularReplacer()) !== JSON.stringify(obj2, this.getCircularReplacer())) {
      return false;
    }

    // Everything is equal
    return true;
  }
}

export default StateManager;
