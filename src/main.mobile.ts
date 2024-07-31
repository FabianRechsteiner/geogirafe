import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import State from './tools/state/state.js';

import ConfigManager from './tools/configuration/configmanager';
import ErrorManager from './tools/error/errormanager.js';
import CsvManager from './tools/export/csvmanager.js';
import I18nManager from './tools/i18n/i18nmanager.js';
import LogManager from './tools/logging/logmanager.js';
import OfflineManager from './tools/offline/offlinemanager';
import ShareManager from './tools/share/sharemanager';
import StateManager from './tools/state/statemanager';
import ThemesManager from './tools/themesmanager';
import WfsManager from './tools/wfs/wfsmanager.js';

import MapComponent from './components/map/component';
import MobileSearchComponent from './components/search-mobile/component';
import MobileThemeComponent from './components/themes-mobile/component';
import OfflineComponent from './components/offline/component';

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
      offlineManager: OfflineManager;
    };
  }
  interface Window {
    CESIUM_BASE_URL: string;
    Cesium: unknown;
    cordova: unknown;
  }
  interface Navigator {
    connection: Connection;
  }
}

interface Connection {
  type: string;
}

declare const Connection: {
  UNKNOWN: string;
  ETHERNET: string;
  WIFI: string;
  CELL_2G: string;
  CELL_3G: string;
  CELL_4G: string;
  CELL: string;
  NONE: string;
};

try {
  // Register Service Worker for offline usage
  const storeVersion: number = 6;
  const dbCacheName: string = 'geogirafe-cache';
  if (navigator?.serviceWorker) {
    navigator.serviceWorker.register('service-worker.js').then((registration) => {
      OfflineManager.getInstance().setServiceWorker(registration.active, storeVersion, dbCacheName);
    });
  }

  if (window.cordova) {
    // If this runs in Cordova, we have to wait the deviceready event to be able to use the connectivity plugin
    document.addEventListener(
      'deviceready',
      () => {
        const networkState = navigator.connection.type;
        const isOffline = networkState === Connection.NONE;
        OfflineManager.getInstance().initializeOfflineState(isOffline);
      },
      false
    );
  } else {
    // Otherwise, just do it without waiting
    OfflineManager.getInstance().initializeOfflineState(!navigator.onLine);
  }

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

  // Tell configManager it should load the mobile configuration as well
  ConfigManager.initMobile();

  // Initialize the managers
  ConfigManager.getInstance().loadConfig();
  LogManager.getInstance()
    .initLogging()
    .then(() => {
      ErrorManager.getInstance();
      CsvManager.getInstance();
      I18nManager.getInstance();
      ThemesManager.getInstance();
      WfsManager.getInstance();
      LogManager.getInstance();

      // Add the state to document, so that it will be accessible everywhere
      document.geogirafe = {
        state: StateManager.getInstance().state,
        stateManager: StateManager.getInstance(),
        shareManager: ShareManager.getInstance(),
        offlineManager: OfflineManager.getInstance()
      };

      // Define components names
      customElements.define('girafe-map', MapComponent);
      customElements.define('girafe-search', MobileSearchComponent);
      customElements.define('girafe-theme-select', MobileThemeComponent);
      customElements.define('girafe-offline', OfflineComponent);
    });
} finally {
  // To prevent the FOUC effect (flash of unstyled content),
  // the html element is set to invisible when the application starts.
  // When all elements have been declared, the html element is made visible
  document.documentElement.style.opacity = '1';
}
