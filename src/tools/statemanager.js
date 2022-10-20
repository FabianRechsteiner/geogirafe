import GeoEvents from '/models/events.js';
import State from '/models/state.js';
import MessageManager from '/tools/messagemanager';

class StateManager {

  static #instance = null;
  static #initializingSingleton = false;

  #state = null;

  constructor() {
    if (!StateManager.#initializingSingleton) {
      // If trying to create another instance
      throw new Error('This is a singleton. Please use the getInstance() method.');
    }

    this.messageManager = MessageManager.getInstance();
    this.#state = new State();
    this.registerEvents();
  }

  static getInstance() {
    if (StateManager.#instance === null) {
      // Singleton do not exists 
      // => create it
      StateManager.#initializingSingleton = true;
      try {
        StateManager.#instance = new StateManager();
      }
      finally {
        StateManager.#initializingSingleton = false;
      }
    }

    return StateManager.#instance;
  }

  sendStateChanged() {
    this.messageManager.sendMessage(GeoEvents.App, {action: 'stateChanged', state: this.#state});
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
    window.addEventListener(GeoEvents.TreeView, (e) => this.onTreeViewEvent(e.detail));
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));
    window.addEventListener(GeoEvents.Theme, (e) => this.onThemeEvent(e.detail));
  }

  onInitEvent(details) {
    if (details.action === 'initState') {
      this.#state = details.state;
    }
  }

  onTreeViewEvent(details) {
    if (details.action === 'layerEnabled') {
      this.onAddLayer(details.layer);
    }
    else if (details.action === 'layerDisabled') {
      this.onRemoveLayer(details.layer);
    }
  }

  onAddLayer(layerInfos) {
    this.#state.activeLayers.push(layerInfos.layer);
    this.sendStateChanged();
  }

  onRemoveLayer(layerInfos) {
    this.#state.activeLayers = this.#state.activeLayers.filter(item => item !== layerInfos.layer);
    this.sendStateChanged();
  }

  onMapEvent(details) {
    if (details.action === 'projectionChanged') {
      this.onChangeProjection(details.projection);
    }
    else if (details.action === 'basemapChanged') {
      this.onChangeBasemap(details.basemap);
    }
    else if (details.action === 'coordsChanged') {
      this.onChangeCoordinates(details.mapX, details.mapY, details.mapZ);
    }
  }

  onChangeProjection(projection) {
    this.#state.projection = projection;
    this.sendStateChanged();
  }

  onChangeBasemap(basemap) {
    this.#state.basemap = basemap.name;
    this.sendStateChanged();
  }

  onChangeCoordinates(mapX, mapY, mapZ) {
    this.#state.mapX = mapX;
    this.#state.mapY = mapY;
    this.#state.mapZ = mapZ;
    this.sendStateChanged();
  }
  
  onThemeEvent(details) {
    if (details.action === 'themeChanged') {
      this.onChangeTheme(details.theme);
    }
  }
 
  onChangeTheme(theme) {
    this.#state.theme = theme.name;
    this.sendStateChanged();
  }

}

export default StateManager;