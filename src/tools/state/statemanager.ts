import GirafeSingleton from '../../base/GirafeSingleton';
import State from './state.js';
import ConfigManager from '../configmanager';
import onChange from 'on-change';

class StateManager extends GirafeSingleton {

  #state: State | null = null;
  #stateProxy: State | null = null;
  get state() {
    return this.#stateProxy;
  }

  // TODO: If Map() needs to be used, it needs some change in the code.
  // with set and get.
  //#callbacks: Map<string, Function[]> = new Map();
  #callbacks: {[key: string]: Function[]} = {};

  configManager: ConfigManager | null = null;

  constructor(type: string) {
    super(type);

    this.configManager = ConfigManager.getInstance();

    this.#state = new State();
    this.#stateProxy = onChange(this.#state, (path, value, oldValue, _applyData) => {
      console.log(`${path} has changed.`);
      this.onChange(path, oldValue, value);
    });

    // Prevent extensions of the State Object.
    Object.preventExtensions(this.#state);

    this.setDefaultValues();
  }

  setDefaultValues() {
    // Set default values
    this.configManager?.loadConfig().then(() => {
      if (this.state && this.configManager?.Config) {
        this.state.projection = this.configManager.Config.map!.srid!;
        this.state.language = this.configManager.Config.languages!.default;
      }
    });
  }

  onChange(property: string, oldValue: any, value: any) {
    const path = property.trim();
    for (const key in this.#callbacks) {
      const regex = new RegExp('^' + key + '$');
      if (path.match(regex)) {
        const callbacks = this.#callbacks[key];
        for (let i=0; i < callbacks.length; ++i) {
          // We find the parent object and send it in the callback
          const parentPath = path.substring(0, path.lastIndexOf('.'));
          const parentObject = this.getPropertyByPath(this.state, parentPath);
          if (!parentObject.found) {
            console.warn('Parent object could no be found in the state');
          }
          callbacks[i](oldValue, value, parentObject.object);
        }
      }
    }
  }

  subscribe(path: string, callback: Function) {
    if (!(path in this.#callbacks)) {
      this.#callbacks[path] = [];
    }
    this.#callbacks[path].push(callback);
    console.log(`Subscribing to ${path}. ${this.#callbacks[path].length} currently suscribing ${path}.`);

    // At the application start, perhaps the value in state was initialized before the subscribe method was called
    // Therefore, if the subscribed value os not null, undefined or an empty object or array
    // We immediately call the callback.
    const obj = this.getPropertyByPath(this.state, path);
    if (obj.found) {
      if (obj.object === null || 
          obj.object === undefined || 
          (Array.isArray(obj.object) && obj.object.length === 0) || 
          (obj.object instanceof Object && Object.keys(obj.object).length === 0)) {
        // Empry object => nothing to do
      }
      else {
        // Object is not null during the subscribe. => we cann the callback
        const parentPath = path.substring(0, path.lastIndexOf('.'));
        const parentObject = this.getPropertyByPath(this.state, parentPath);
        callback(null, obj.object, parentObject);
      }
    }
  }

  unsubscribe(callback: Function) {
    for (const path in this.#callbacks) {
      const callbacks = this.#callbacks[path];
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
        console.log(`Unsubscribing to ${path}. ${this.#callbacks[path].length} subscribtions remaining.`);
      }
    }
  }

  getPropertyByPath(obj: any, path: any) {
    let currentObj = obj;
    if (path.trim() !== '') {
      const keys = path.split(".");
    
      for (let i = 0; i < keys.length; i++) {
        if (keys[i] in currentObj) {
          currentObj = currentObj[keys[i]];
        } else {
          return { found: false, object: null };
        }
      }
    }

    return { found: true, object: currentObj };
  }
}

export default StateManager;
