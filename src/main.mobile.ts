import OfflineManager from './tools/offline/offlinemanager';
import MapComponent from './components/map/component';
import MobileSearchComponent from './components/search-mobile/component';
import MobileThemeComponent from './components/themes-mobile/component';
import OfflineComponent from './components/offline/component';
import { initialize } from './initialize';
import SwipeUpPanelMobile from './components/swipe-up-panel-mobile/component';

// Redirect to desktop interface if we are NOT on mobile
if (!navigator.userAgent.includes('iPhone') && !navigator.userAgent.includes('Android')) {
  window.location.href = 'index.html';
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

// Common initialization
initialize().then(() => {
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

  // Define components names
  customElements.define('girafe-map', MapComponent);
  customElements.define('girafe-search', MobileSearchComponent);
  customElements.define('girafe-theme-select', MobileThemeComponent);
  customElements.define('girafe-offline', OfflineComponent);
  customElements.define('girafe-swipe-up-panel', SwipeUpPanelMobile);

  // To prevent the FOUC effect (flash of unstyled content),
  // the html element is set to invisible when the application starts.
  // When all elements have been declared, the html element is made visible
  document.documentElement.style.opacity = '1';
});
