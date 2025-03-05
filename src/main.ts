import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import tippy from 'tippy.js';
import State from './tools/state/state';

import AuthManager from './tools/auth/authmanager';
import ConfigManager from './tools/configuration/configmanager';
import CsvManager from './tools/export/csvmanager';
import ErrorManager from './tools/error/errormanager';
import I18nManager from './tools/i18n/i18nmanager';
import LogManager from './tools/logging/logmanager';
import OfflineManager from './tools/offline/offlinemanager';
import OrderingManager from './tools/ordering/orderingmanager';
import ShareManager from './tools/share/sharemanager';
import StateManager from './tools/state/statemanager';
import ThemesManager from './tools/themes/themesmanager';
import WfsManager from './tools/wfs/wfsmanager';

import AboutComponent from './components/about/component';
import BasemapComponent from './components/basemap/component';
import ColorSwitcherComponent from './components/colorswitcher/component';
import CoordinateComponent from './components/coordinate/component';
import CrossSectionSettingsComponent from './components/cross-section/cross-section-settings/component';
import CrossSectionViewComponent from './components/cross-section/cross-section-viewer/component';
import DrawingComponent from './components/drawing/component';
import HelpComponent from './components/help/component';
import InfoboxComponent from './components/infobox/component';
import InfoWindowComponent from './components/infowindow/component';
import LayoutComponent from './components/layout/component';
import LRPanelComponent from './components/lr-panel/component';
import MapComponent from './components/map/component';
import MenuButtonComponent from './components/menubutton/component';
import ModalsComponent from './components/modals/component';
import NavigationComponent from './components/navigation/component';
import OauthComponent from './components/auth/component';
import PrintComponent from './components/print/component';
import PrototypeBannerComponent from './components/prototypebanner/component';
import QueryBuilderComponent from './components/querybuilder/component';
import ScaleComponent from './components/scale/component';
import SearchComponent from './components/search/component';
import SelectionGridComponent from './components/selectiongrid/component';
import SelectionWindowComponent from './components/selectionwindow/component';
import ShareComponent from './components/share/component';
import ThemeComponent from './components/themes/component';
import TreeViewGroupComponent from './components/treeview/treeviewgroup/component';
import TreeViewItemComponent from './components/treeview/treeviewitem/component';
import TreeViewRootComponent from './components/treeview/treeviewroot/component';
import TreeViewThemeComponent from './components/treeview/treeviewtheme/component';
import UserPreferencesComponent from './components/userpreferences/component';
import VideoRecordComponent from './components/videorecord/component';

// Redirect to mobile interface if we are on mobile
if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('Android')) {
  window.location.href = 'mobile.html';
}

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

    gOpenWindow(
      title: string,
      url: string,
      width?: string | number,
      height?: string | number,
      top?: string | number,
      left?: string | number
    ): void;
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
      AuthManager.getInstance().initialize();
      ErrorManager.getInstance();
      CsvManager.getInstance();
      I18nManager.getInstance();
      WfsManager.getInstance();
      OrderingManager.getInstance();
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
      customElements.define('girafe-about', AboutComponent);
      customElements.define('girafe-basemap', BasemapComponent);
      customElements.define('girafe-colorswitcher', ColorSwitcherComponent);
      customElements.define('girafe-coordinate', CoordinateComponent);
      customElements.define('girafe-cross-section-settings', CrossSectionSettingsComponent);
      customElements.define('girafe-cross-section-view', CrossSectionViewComponent);
      customElements.define('girafe-help', HelpComponent);
      customElements.define('girafe-info-window', InfoWindowComponent);
      customElements.define('girafe-infobox', InfoboxComponent);
      customElements.define('girafe-layout', LayoutComponent);
      customElements.define('girafe-lr-panel', LRPanelComponent);
      customElements.define('girafe-map', MapComponent);
      customElements.define('girafe-drawing', DrawingComponent); // Requires MapComponent
      customElements.define('girafe-menu-button', MenuButtonComponent);
      customElements.define('girafe-modals', ModalsComponent);
      customElements.define('girafe-nav-history', NavigationComponent);
      customElements.define('girafe-oauth', OauthComponent);
      customElements.define('girafe-print', PrintComponent);
      customElements.define('girafe-prototype-banner', PrototypeBannerComponent);
      customElements.define('girafe-query-builder', QueryBuilderComponent);
      customElements.define('girafe-scale', ScaleComponent);
      customElements.define('girafe-search', SearchComponent);
      customElements.define('girafe-selection-grid', SelectionGridComponent);
      customElements.define('girafe-selection-window', SelectionWindowComponent);
      customElements.define('girafe-share', ShareComponent);
      customElements.define('girafe-theme-select', ThemeComponent);
      customElements.define('girafe-tree-view-group', TreeViewGroupComponent);
      customElements.define('girafe-tree-view-item', TreeViewItemComponent);
      customElements.define('girafe-tree-view-theme', TreeViewThemeComponent);
      customElements.define('girafe-tree-view', TreeViewRootComponent);
      customElements.define('girafe-user-preferences', UserPreferencesComponent);
      customElements.define('girafe-video-record', VideoRecordComponent);
    });
} finally {
  // To prevent the FOUC effect (flash of unstyled content),
  // the html element is set to invisible when the application starts.
  // When all elements have been declared, the html element is made visible
  document.documentElement.style.opacity = '1';
}
