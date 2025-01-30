import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import tippy from 'tippy.js';
import State from './tools/state/state';

import ConfigManager from './tools/configuration/configmanager';
import ErrorManager from './tools/error/errormanager';
import I18nManager from './tools/i18n/i18nmanager';
import LogManager from './tools/logging/logmanager';
import StateManager from './tools/state/statemanager';
import ThemesManager from './tools/themes/themesmanager';
import LayerManager from './tools/layers/layermanager';

import BasemapComponent from './components/basemap/component';
import InfoboxComponent from './components/infobox/component';
import MapComponent from './components/map/component';
import ShareManager from './tools/share/sharemanager';
import OfflineManager from './tools/offline/offlinemanager';

// Extend default Document and Window interfaces
declare global {
  interface Document {
    geogirafe: {
      state: State;
      stateManager: StateManager;
      shareManager: ShareManager;
      offlineManager: OfflineManager;
      themesManager: ThemesManager;
      configManager: ConfigManager;
    };
  }
  interface Window {
    CESIUM_BASE_URL: string;
    Cesium: unknown;
    gConfirm(message: string, title?: string): Promise<boolean>;
    gAlert(message: string, title?: string): Promise<boolean>;
    gPrompt(message: string, title?: string, placeholder?: string): Promise<string | false>;
  }
}

try {
  // Default configuration for Cesium (see https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/)
  window.CESIUM_BASE_URL = 'lib/cesium/';

  // Register custom EPSG
  // https://epsg.io/21781
  proj4.defs(
    'EPSG:21781',
    '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=660.077,13.551,369.344,2.484,1.783,2.939,5.66 +units=m +no_defs'
  );
  // https://epsg.io/2056
  proj4.defs(
    'EPSG:2056',
    '+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs'
  );
  register(proj4);

  // Override default tooltip maxWidth:
  tippy.setDefaultProps({ maxWidth: '' });

  // Initialize the managers
  ConfigManager.getInstance();
  LogManager.getInstance()
    .initLogging()
    .then(() => {
      ErrorManager.getInstance();
      LayerManager.getInstance();
      I18nManager.getInstance();
      ThemesManager.getInstance().initialize();

      // Add the state to document, so that it will be accessible everywhere
      document.geogirafe = {
        state: StateManager.getInstance().state,
        stateManager: StateManager.getInstance(),
        shareManager: ShareManager.getInstance(),
        offlineManager: OfflineManager.getInstance(),
        themesManager: ThemesManager.getInstance(),
        configManager: ConfigManager.getInstance()
      };

      // Define components names
      customElements.define('girafe-basemap', BasemapComponent);
      customElements.define('girafe-infobox', InfoboxComponent);
      customElements.define('girafe-map', MapComponent);
    });
} finally {
  // To prevent the FOUC effect (flash of unstyled content),
  // the html element is set to invisible when the application starts.
  // When all elements have been declared, the html element is made visible
  document.documentElement.style.opacity = '1';
}
