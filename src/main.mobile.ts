import OfflineManager from './tools/offline/offlinemanager';
import MapComponent from './components/map/component';
import MobileSearchComponent from './components/search-mobile/component';
import OfflineComponent from './components/offline/component';
import { initialize, redirectTo, SplashScreen } from './initialize';
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
import DisplayMenuButtonMobile from './components/displaymenubutton-mobile/component';
import MenuMobile from './components/menu-mobile/component';
import { DrawingState } from './components/drawing/drawingFeature';
import DrawingSerializer from './components/drawing/drawingSerializer';
import StateSerializer from './tools/share/stateserializer';
import DrawingContainerMobile from './components/drawing-container-mobile/component';
import DrawingComponentMobile from './components/drawing/component-mobile';
import MenuMobile3dButton from './components/menu-buttons-mobile/MenuMobile3dButton';
import MenuMobileOfflineButton from './components/menu-buttons-mobile/MenuMobileOfflineButton';
import MenuMobileDrawingButton from './components/menu-buttons-mobile/MenuMobileDrawingButton';
import ModalsComponent from './components/modals/component';

// Redirect to desktop interface if we are NOT on mobile
if (!navigator.userAgent.includes('iPhone') && !navigator.userAgent.includes('Android')) {
  redirectTo('index.html');
}

// Add custom state and serializers (need to be done early, because the shared state will need them)
StateManager.getInstance().state.extendedState.drawing = new DrawingState();
StateSerializer.getInstance().addSerializer(DrawingState, new DrawingSerializer());

// Display the splash-screen
const splash = new SplashScreen();
splash.begin();

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
  customElements.define('girafe-display-menu-button-mobile', DisplayMenuButtonMobile);
  customElements.define('girafe-menu-mobile', MenuMobile);
  customElements.define('girafe-modals', ModalsComponent);
  customElements.define('girafe-swipe-up-panel', SwipeUpPanelMobile);
  customElements.define('girafe-align-north-button-mobile', AlignNorthButtonMobile);
  customElements.define('girafe-selection-panel-mobile', SelectionPanelMobile);
  customElements.define('girafe-geolocation-mobile', GeolocationMobile);
  customElements.define('girafe-drawing-mobile', DrawingComponentMobile);
  customElements.define('girafe-drawing-container-mobile', DrawingContainerMobile);
  customElements.define('girafe-menu-mobile-3d-button', MenuMobile3dButton);
  customElements.define('girafe-menu-mobile-offline-button', MenuMobileOfflineButton);
  customElements.define('girafe-menu-mobile-drawing-button', MenuMobileDrawingButton);

  // Remove the splash-screen
  splash.end();
});
