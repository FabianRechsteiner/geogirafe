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
        // NOTE: the method areEqual() will also ignore underscores when deeply comparing objects
        ignoreUnderscores: true,
        ignoreSymbols: true,
        ignoreDetached: true
      }
    );

    // Prevent extensions of the State Object.
    Object.preventExtensions(this.#girafeState);

    this.setDefaultValues();
  }

  private setDefaultValues() {
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

  private onChange(property: string, oldValue: unknown, value: unknown) {
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

  public subscribe(path: string, callback: Callback): Callback;
  public subscribe(path: RegExp, callback: Callback): Callback;
  public subscribe(path: string | RegExp, callback: Callback): Callback {
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
  public unsubscribe(callback: Callback): void;
  public unsubscribe(callbacks: Callback[]): void;
  public unsubscribe(callbacks: Callback | Callback[]): void {
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
  public getPropertyByPath(obj: any, path: string) {
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
  public setPropertyByPath(obj: any, path: string, value: any): boolean {
    const result = this.getPropertyByPath(obj, path);
    if (result.parentObject && result.lastKey) {
      result.parentObject[result.lastKey] = value;
      return true;
    }
    return false;
  }

  /**
   * Returns true if to object are deeply equal, false otherwise
   * Circular references are ignored
   */
  private areEqual(obj1: any, obj2: any, visitedObjects = new WeakSet()) {
    let areEqual: boolean | undefined;

    areEqual = this.areNumbersEqual(obj1, obj2);
    if (areEqual !== undefined) {
      return areEqual;
    }

    areEqual = this.areNullOrUndefinedEqual(obj1, obj2);
    if (areEqual !== undefined) {
      return areEqual;
    }

    areEqual = this.areSimpleValuesEqual(obj1, obj2);
    if (areEqual !== undefined) {
      return areEqual;
    }

    areEqual = this.areCircularReferencesEqual(obj1, obj2, visitedObjects);
    if (areEqual !== undefined) {
      return areEqual;
    }

    // Mark the objects as visited
    visitedObjects.add(obj1);
    visitedObjects.add(obj2);

    areEqual = this.areArraysEqual(obj1, obj2, visitedObjects);
    if (areEqual !== undefined) {
      return areEqual;
    }

    areEqual = this.areObjectsEqual(obj1, obj2, visitedObjects);
    if (areEqual !== undefined) {
      return areEqual;
    }

    // Unmanaged case
    throw Error('Unmanaged case for equality check');
  }

  private areNumbersEqual(obj1: any, obj2: any): boolean | undefined {
    if (typeof obj1 === 'number' && typeof obj2 === 'number') {
      // Special case for numbers : check NaN
      if (Number.isNaN(obj1) && Number.isNaN(obj2)) {
        return true;
      }
      return obj1 === obj2;
    }

    // Not numbers
    return undefined;
  }

  private areNullOrUndefinedEqual(obj1: any, obj2: any): boolean | undefined {
    if (obj1 === null || obj2 === null || obj1 === undefined || obj2 === undefined) {
      return obj1 === obj2;
    }

    // Not null or undefined
    return undefined;
  }

  private areSimpleValuesEqual(obj1: any, obj2: any): boolean | undefined {
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
      return obj1 === obj2;
    }

    // Not a simple object
    return undefined;
  }

  private areCircularReferencesEqual(obj1: any, obj2: any, visitedObjects: WeakSet<any>): boolean | undefined {
    if (visitedObjects.has(obj1) || visitedObjects.has(obj2)) {
      // This object was already checked. It should be the same object
      return obj1 === obj2;
    }

    // Not a circular reference
    return undefined;
  }

  private areArraysEqual(obj1: any, obj2: any, visitedObjects: WeakSet<any>): boolean | undefined {
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      if (obj1.length !== obj2.length) {
        // Different length for both arrays
        return false;
      }
      for (let i = 0; i < obj1.length; i++) {
        if (!this.areEqual(obj1[i], obj2[i], visitedObjects)) {
          // Not equal
          return false;
        }
      }

      // Arrays are equal
      return true;
    }

    // Not arrays
    return undefined;
  }

  private areObjectsEqual(obj1: any, obj2: any, visitedObjects: WeakSet<any>): boolean | undefined {
    if (typeof obj1 === 'object' && typeof obj2 === 'object') {
      // Ignore properties that begins with underscore
      // This is coherent with the configuration of on-change
      // Otherwise, all objects will be compared (including openlayers ones), and we do not want this
      const keys1 = Object.keys(obj1).filter((key) => !key.startsWith('_'));
      const keys2 = Object.keys(obj2).filter((key) => !key.startsWith('_'));

      if (keys1.length !== keys2.length) {
        // Not the same number of properties
        return false;
      }

      for (const key of keys1) {
        if (!obj2.hasOwnProperty(key)) {
          // Key is not present in the second object
          return false;
        }

        if (!this.areEqual(obj1[key], obj2[key], visitedObjects)) {
          // Properties have different values
          return false;
        }
      }

      // Everything is equal
      return true;
    }

    // Not an object
    return undefined;
  }
}

export default StateManager;
