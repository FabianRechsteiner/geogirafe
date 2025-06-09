/* eslint @typescript-eslint/no-explicit-any: 0 */

import GirafeSingleton from '../../base/GirafeSingleton';
import State from './state';
import ConfigManager from '../configuration/configmanager';
import { getPropertyByPath } from '../utils/pathUtils';
import Brain from './brain/brain';

export type Callback = (oldValue: any, value: any, parents?: any) => void | Promise<void>;

class StateManager extends GirafeSingleton {
  private readonly girafeState = new State();
  private readonly stateProxy: Brain<State>;
  get state() {
    return this.stateProxy.getState();
  }

  private readonly callbacks: Record<string, Callback[]> = {};

  configManager: ConfigManager;

  constructor(type: string) {
    super(type);

    this.configManager = ConfigManager.getInstance();

    this.stateProxy = new Brain(this.girafeState, (path, oldValue, newValue, parents) => {
      this.onChange(path, oldValue, newValue, parents);
    });

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

  private onChange(property: string, oldValue: unknown, value: unknown, parents: any[]) {
    const path = property.trim();
    for (const key in this.callbacks) {
      const regex = new RegExp('^' + key + '$');
      if (path.match(regex)) {
        const callbacks = this.callbacks[key];
        for (const callback of callbacks) {
          callback(oldValue, value, parents.length === 1 ? parents[0] : parents);
        }
      }
    }
  }

  public subscribe(path: string, callback: Callback): Callback;
  public subscribe(path: RegExp, callback: Callback): Callback;
  public subscribe(path: string | RegExp, callback: Callback): Callback {
    const pathAsString = typeof path === 'string' ? path : path.source;
    if (!(pathAsString in this.callbacks)) {
      this.callbacks[pathAsString] = [];
    }
    this.callbacks[pathAsString].push(callback);
    console.debug(
      `Subscribing to ${path}. ${this.callbacks[pathAsString].length} are currently subscribing ${pathAsString}.`
    );

    // At the application start, perhaps the value in state was initialized before the subscribe method was called
    // Therefore, if the subscribed value os not null, undefined or an empty object or array
    // We immediately call the callback.
    const obj = getPropertyByPath(this.state, pathAsString);
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
        const parentObject = getPropertyByPath(this.state, parentPath);
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
      for (const path in this.callbacks) {
        const callbacks = this.callbacks[path];
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          found = true;
          callbacks.splice(index, 1);
          console.debug(`Unsubscribing to ${path}. ${this.callbacks[path].length} subscribtions remaining.`);
        }
      }
      if (!found) {
        throw Error(`Cannot unsubscribe this callback : it does not exist`);
      }
    });
  }

  public batchChanges(statechanges: (state: State) => void) {
    this.stateProxy.delay(statechanges);
  }
}

export default StateManager;
