import GeoEvents from '../models/events.js';
import State from '../tools/state/state.js';
import MessageManager from '../tools/messagemanager';
import StateManager from './state/statemanager.js';
import GirafeSingleton from '../base/GirafeSingleton.js';

class UrlManager extends GirafeSingleton {
/*
  static #instance = null;
  static #initializingSingleton = false;

  // How many objects are dependent of the UrlManager
  dependencyTotalCount = 0;
  dependencyInitializedCount = 0;

  updateUrlTimeout = null;

  get everythingInitialized() {
    return this.dependencyInitializedCount === this.dependencyTotalCount;
  }

  constructor(dependencyCount) {
    if (!UrlManager.#initializingSingleton) {
      // If trying to create another instance
      throw new Error('This is a singleton. Please use the getInstance() method.');
    }

    this.messageManager = MessageManager.getInstance();
    this.dependencyTotalCount = dependencyCount;
    this.registerEvents();
  }

  static getInstance(dependentObjects) {
    if (UrlManager.#instance === null) {
      // Singleton do not exists 
      // => create it
      UrlManager.#initializingSingleton = true;
      try {
        UrlManager.#instance = new UrlManager(dependentObjects.length);
      }
      finally {
        UrlManager.#initializingSingleton = false;
      }
    }

    return UrlManager.#instance;
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
    window.addEventListener(GeoEvents.App, (e) => this.onAppEvent(e.detail));
  }

  manageStartUrl() {
    const state = this.decodeUrl(window.location.href);
    if (state != null) {
      // There is a default state
      this.messageManager.sendMessage(GeoEvents.Init, {action: 'initState', state: state});
    }
  }

  onInitEvent(details) {
    if (details.action === 'componentInitialized') {
      this.dependencyInitializedCount++;
      console.log(`Component initialized: ${this.dependencyInitializedCount}/${this.dependencyTotalCount}`);
      if (this.everythingInitialized) {
        // All dependency are initialized.
        // => initialize the application from the start URL
        this.manageStartUrl();
      }
      else if (this.dependencyInitializedCount > this.dependencyTotalCount) {
        throw Error("One or more dependency were not declared. This could lead to initialization errors. Please verify the initialization of UrlManager in initialize.js.");
      }
    }
  }

  onAppEvent(details) {
    if (details.action === 'stateChanged') {
      if (this.everythingInitialized) {
        // Update URL only if every component have been initialized
        // Otherwise the URL will be overwritten with partial data
        
        // Some times, for example when resizing the window, 
        // this event can be sent multiple times in the same second.
        // This can cause an error in the browser, and the URL won't be update any more after that
        // Therefore, we only want to update the URL every 500 ms
        if (this.updateUrlTimeout !== null) {
          clearTimeout(this.updateUrlTimeout);
        }
        this.updateUrlTimeout = setTimeout(() => {
          const encodedState = this.encodeState(details.state);
          window.history.replaceState(null, '', encodedState);
        }, 500);
      }
    }
  }

  encodeState(state) {
    const url = `#${state.mapX},${state.mapY},${state.mapZ}|${state.projection}|${state.basemap}|${state.theme}`;
    return url;
  }

  decodeUrl(url) {
    if (!url.includes('#')) {
      // Nothing to decode
      return null;
    }

    const encodedState = url.split('#')[1];
    const params = encodedState.split('|');
    const coords = params[0].split(',');

    const state = new State();
    state.mapX = coords[0];
    state.mapY = coords[1];
    state.mapZ = coords[2];
    state.projection = params[1];
    state.basemap = decodeURIComponent(params[2]);
    state.theme = decodeURIComponent(params[3]);

    return state;
  }*/
}

export default UrlManager;