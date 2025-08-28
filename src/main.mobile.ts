import OfflineManager from './tools/offline/offlinemanager';
import MapComponent from './components/map/component';
import MobileSearchComponent from './components/search-mobile/component';
import OfflineComponent from './components/offline/component';
import { initialize } from './initialize';
import SwipeUpPanelMobile from './components/swipe-up-panel-mobile/component';
import LayerListMobile from './components/layerlist-mobile/layerlist/component';
import LayerListItemMobile from './components/layerlist-mobile/layerlistitem/component';
import BasemapListItemMobile from './components/basemaplist-mobile/basemaplistitem/component';
import BasemapListMobile from './components/basemaplist-mobile/basemaplist/component';
import ThemeListMobile from './components/themelist-mobile/themelist/component';
import ThemeListItemMobile from './components/themelist-mobile/themelistitem/component';
import BasemapThemeLayerSelectorMobile from './components/basemapthemelayerselector-mobile/component';
import DisplaySelectorButtonMobile from './components/displayselectorbutton-mobile/component';
import AlignNorthButtonMobile from './components/alignnorthbutton-mobile/component';
import SelectionPanelMobile from './components/selectionpanel-mobile/component';
import GeolocationMobile from './components/geolocation-mobile/component';
import InfoboxComponent from './components/infobox/component';
import StateManager from './tools/state/statemanager';

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

  const state = StateManager.getInstance().state;
  state.interface.isMobile = true;

  // Define components names
  customElements.define('girafe-infobox', InfoboxComponent);
  customElements.define('girafe-map', MapComponent);
  customElements.define('girafe-search', MobileSearchComponent);
  customElements.define('girafe-offline', OfflineComponent);
  customElements.define('girafe-basemap-list-item-mobile', BasemapListItemMobile);
  customElements.define('girafe-basemap-list-mobile', BasemapListMobile);
  customElements.define('girafe-theme-list-item-mobile', ThemeListItemMobile);
  customElements.define('girafe-theme-list-mobile', ThemeListMobile);
  customElements.define('girafe-layer-list-item-mobile', LayerListItemMobile);
  customElements.define('girafe-layer-list-mobile', LayerListMobile);
  customElements.define('girafe-basemap-theme-layer-selector-mobile', BasemapThemeLayerSelectorMobile);
  customElements.define('girafe-display-selector-button-mobile', DisplaySelectorButtonMobile);
  customElements.define('girafe-swipe-up-panel', SwipeUpPanelMobile);
  customElements.define('girafe-align-north-button-mobile', AlignNorthButtonMobile);
  customElements.define('girafe-selection-panel-mobile', SelectionPanelMobile);
  customElements.define('girafe-geolocation-mobile', GeolocationMobile);

  // To prevent the FOUC effect (flash of unstyled content),
  // the html element is set to invisible when the application starts.
  // When all elements have been declared, the html element is made visible
  document.documentElement.style.opacity = '1';
});
