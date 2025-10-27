import AlignNorthButtonMobile from '../../components/alignnorthbutton-mobile/component';
import MobileOauthComponent from '../../components/auth-mobile/component';
import BasemapListMobile from '../../components/basemaplist-mobile/basemaplist/component';
import BasemapListItemMobile from '../../components/basemaplist-mobile/basemaplistitem/component';
import BasemapThemeLayerSelectorMobile from '../../components/basemapthemelayerselector-mobile/component';
import DisplayMenuButtonMobile from '../../components/displaymenubutton-mobile/component';
import DisplaySelectorButtonMobile from '../../components/displayselectorbutton-mobile/component';
import DrawingContainerMobile from '../../components/drawing-container-mobile/component';
import DrawingComponentMobile from '../../components/drawing/component-mobile';
import GeolocationMobile from '../../components/geolocation-mobile/component';
import InfoboxComponent from '../../components/infobox/component';
import LayerListMobile from '../../components/layerlist-mobile/layerlist/component';
import LayerListItemMobile from '../../components/layerlist-mobile/layerlistitem/component';
import MapComponent from '../../components/map/component';
import MenuMobile3dButton from '../../components/menu-buttons-mobile/MenuMobile3dButton';
import MenuMobileDrawingButton from '../../components/menu-buttons-mobile/MenuMobileDrawingButton';
import MenuMobileOfflineButton from '../../components/menu-buttons-mobile/MenuMobileOfflineButton';
import MenuMobile from '../../components/menu-mobile/component';
import ModalsComponent from '../../components/modals/component';
import OfflineComponent from '../../components/offline/component';
import MobileSearchComponent from '../../components/search-mobile/component';
import SelectionPanelMobile from '../../components/selectionpanel-mobile/component';
import SwipeUpPanelMobile from '../../components/swipe-up-panel-mobile/component';
import ThemeListMobile from '../../components/themelist-mobile/themelist/component';
import ThemeListItemMobile from '../../components/themelist-mobile/themelistitem/component';
import GeoGirafeApp from './geogirafeapp';

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

export default class GeoGirafeAppMobile extends GeoGirafeApp {
  protected override initializeInterface() {
    if (window.cordova) {
      // If this runs in Cordova, we have to wait the deviceready event to be able to use the connectivity plugin
      document.addEventListener(
        'deviceready',
        () => {
          const networkState = navigator.connection.type;
          const isOffline = networkState === Connection.NONE;
          this.context.offlineManager.initializeOfflineState(isOffline);
        },
        false
      );
    } else {
      // Otherwise, just do it without waiting
      this.context.offlineManager.initializeOfflineState(!navigator.onLine);
    }

    this.context.stateManager.state.interface.isMobile = true;
  }

  protected override defineCoreComponents() {
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
    customElements.define('girafe-oauth-mobile', MobileOauthComponent);
  }
}
