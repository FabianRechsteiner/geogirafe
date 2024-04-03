import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import tippy from 'tippy.js';
import State from './tools/state/state.js';

import ConfigManager from './tools/configuration/configmanager';
import I18nManager from './tools/i18nmanager';
import MessageManager from './tools/messagemanager';
import ShareManager from './tools/share/sharemanager';
import StateManager from './tools/state/statemanager';
import ThemesManager from './tools/themesmanager';
import UrlManager from './tools/urlmanager';
import WfsManager from './tools/wfsmanager';

// TODO: Migrate all these components to TypeScript
import AboutComponent from './components/about/component';
import BasemapComponent from './components/basemap/component';
import ButtonComponent from './components/button/component';
import ColorSwitcherComponent from './components/colorswitcher/component';
import CoordinateComponent from './components/coordinate/component';
import GlobeComponent from './components/globe/component';
import HelpComponent from './components/help/component';
import InfoboxComponent from './components/infobox/component.js';
import LanguageComponent from './components/language/component';
import MapComponent from './components/map/component';
import MenuButtonComponent from './components/menubutton/component.js';
import NavBookmarksComponent from './components/navigation/navbookmarks/component';
import NavHelperComponent from './components/navigation/navhelper/component';
import PrintComponent from './components/print/component';
import ProjectionComponent from './components/projection/component';
import PrototypeBannerComponent from './components/prototypebanner/component.js';
import QueryBuilderComponent from './components/querybuilder/component';
import RedliningComponent from './components/redlining/component.js';
import ScaleComponent from './components/scale/component.js';
import SearchComponent from './components/search/component';
import SelectionGridComponent from './components/selectiongrid/component';
import SelectionWindowComponent from './components/selectionwindow/component';
import ShareComponent from './components/share/component';
import ThemeComponent from './components/themes/component';
import TreeViewComponent from './components/treeview/component';
import TreeViewItemComponent from './components/treeviewitem/component';
import TreeViewGroupComponent from './components/treeviewgroup/component';
import VideoRecordComponent from './components/videorecord/component';

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
customElements.define('girafe-about', AboutComponent);
customElements.define('girafe-basemap', BasemapComponent);
customElements.define('girafe-button', ButtonComponent);
customElements.define('girafe-colorswitcher', ColorSwitcherComponent);
customElements.define('girafe-coordinate', CoordinateComponent);
customElements.define('girafe-globe-select', GlobeComponent);
customElements.define('girafe-help', HelpComponent);
customElements.define('girafe-infobox', InfoboxComponent);
customElements.define('girafe-language-select', LanguageComponent);
customElements.define('girafe-map', MapComponent);
customElements.define('girafe-menu-button', MenuButtonComponent);
customElements.define('girafe-nav-bookmarks', NavBookmarksComponent);
customElements.define('girafe-nav-history', NavHelperComponent);
customElements.define('girafe-print', PrintComponent);
customElements.define('girafe-prototype-banner', PrototypeBannerComponent);
customElements.define('girafe-proj-select', ProjectionComponent);
customElements.define('girafe-query-builder', QueryBuilderComponent);
customElements.define('girafe-redlining', RedliningComponent);
customElements.define('girafe-scale', ScaleComponent);
customElements.define('girafe-search', SearchComponent);
customElements.define('girafe-selection-grid', SelectionGridComponent);
customElements.define('girafe-selection-window', SelectionWindowComponent);
customElements.define('girafe-share', ShareComponent);
customElements.define('girafe-theme-select', ThemeComponent);
customElements.define('girafe-tree-view', TreeViewComponent);
customElements.define('girafe-tree-view-group', TreeViewGroupComponent);
customElements.define('girafe-tree-view-item', TreeViewItemComponent);
customElements.define('girafe-video-record', VideoRecordComponent);
