import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import State from './tools/state/state.js';

import ConfigManager from './tools/configuration/configmanager.js';
import ErrorManager from './tools/errormanager.js';
import CsvManager from './tools/csvManager.js';
import I18nManager from './tools/i18nmanager.js';
import MessageManager from './tools/messagemanager.js';
import ShareManager from './tools/share/sharemanager.js';
import StateManager from './tools/state/statemanager.js';
import ThemesManager from './tools/themesmanager.js';
import UrlManager from './tools/urlmanager.js';
import WfsManager from './tools/wfsmanager.js';

import MapComponent from './components/map/component.js';
import MobileSearchComponent from './components/search-mobile/component.js';
import MobileThemeComponent from './components/themes-mobile/component.js';

// Redirect to desktop interface if we are NOT on mobile
if (!navigator.userAgent.includes('iPhone') && !navigator.userAgent.includes('Android')) {
  window.location.href = 'index.html';
}

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

  // Tell configmanager it should load the mobile configuration as well
  ConfigManager.initMobile();

  // Initialize the managers
  ConfigManager.getInstance();
  ErrorManager.getInstance();
  CsvManager.getInstance();
  I18nManager.getInstance();
  MessageManager.getInstance();
  ThemesManager.getInstance();
  UrlManager.getInstance();
  WfsManager.getInstance();

  // Add the state to document, so that it will be accessible everywhere
  document.geogirafe = {
    state: StateManager.getInstance().state,
    stateManager: StateManager.getInstance(),
    shareManager: ShareManager.getInstance()
  };

  // Define components names
  customElements.define('girafe-map', MapComponent);
  customElements.define('girafe-search', MobileSearchComponent);
  customElements.define('girafe-theme-select', MobileThemeComponent);
} finally {
  // To prevent the FOUC effect (flash of unstyled content),
  // the html element is set to invisible when the application starts.
  // When all elements have been declared, the html element is made visible
  document.documentElement.style.opacity = '1';
}
