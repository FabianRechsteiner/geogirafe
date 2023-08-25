import ConfigManager from './tools/configmanager';
import UrlManager from './tools/urlmanager';
import StateManager from './tools/state/statemanager';
import I18nManager from './tools/i18nmanager';
import I18MessageManager from './tools/messagemanager';

import TreeViewComponent from  './components/treeview/component.js';
import MapComponent from './components/map/component.js';
import SearchComponent from './components/search/component.js';
import ProjectionComponent from './components/projection/component.js';
import GlobeComponent from './components/globe/component.js';
import BasemapComponent from './components/basemap/component.ts';
import ThemeComponent from './components/themes/component.js';
import LanguageComponent from './components/language/component.js';
import ButtonComponent from './components/button/component.js';
import ScaleComponent from './components/scale/component.js';
import CoordinateComponent from './components/coordinate/component.js';
import MenuButtonComponent from './components/menubutton/component.js';
import RedliningComponent from './components/redlining/component.js';
import PrintComponent from './components/print/component.js';
import SelectionWindowComponent from './components/selectionwindow/component.js';
import SelectionGridComponent from './components/selectiongrid/component.js';
import HelpComponent from './components/help/component.js';
import AboutComponent from './components/about/component.ts';

import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import ThemesManager from './tools/themesmanager';
import WfsManager from './tools/wfsmanager';

// Register custom EPSG
// https://epsg.io/21781
proj4.defs('EPSG:21781', '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=660.077,13.551,369.344,2.484,1.783,2.939,5.66 +units=m +no_defs');
// https://epsg.io/2056
proj4.defs("EPSG:2056" , '+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs');
register(proj4);

// Initialize the themes manager, in order to load the themes
ThemesManager.getInstance();
WfsManager.getInstance();

// Add the state to document, so that it will be accessible everywhere
document.state = StateManager.getInstance().state;
