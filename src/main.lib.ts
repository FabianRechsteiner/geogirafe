import ShareManager from './tools/share/sharemanager';
import State from './tools/state/state';
import StateManager from './tools/state/statemanager';

// Extend default Document and Window interfaces
declare global {
  interface Document {
    geogirafe: {
      state: State;
      stateManager: StateManager;
      shareManager: ShareManager;
    };
  }
  interface Window {
    CESIUM_BASE_URL: string;
    Cesium: unknown;
  }
}
