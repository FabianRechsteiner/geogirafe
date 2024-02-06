import State from './tools/state/state.js';
import StateManager from './tools/state/statemanager';

// Extend default Document and Window interfaces
declare global {
  interface Document {
    geogirafe: {
      state: State;
      stateManager: StateManager;
    };
  }
  interface Window {
    CESIUM_BASE_URL: string;
    Cesium: unknown;
  }
}
