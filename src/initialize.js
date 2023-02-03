import ConfigManager from './tools/configmanager.js';
import UrlManager from './tools/urlmanager.js';
import StateManager from './tools/statemanager.js';
import I18nManager from './tools/i18nmanager.js';
import I18MessageManager from './tools/messagemanager.js';

import TreeViewComponent from  './components/treeview/component.js';
import MapComponent from './components/map/component.js';
import SearchComponent from './components/search/component.js';
import ProjectionComponent from './components/projection/component.js';
import BasemapComponent from './components/basemap/component.js';
import ThemeComponent from './components/themes/component.js';
import LanguageComponent from './components/language/component.js';
import ButtonComponent from './components/button/component.js';
import MenuButtonComponent from './components/menubutton/component.js';
import RedliningComponent from './components/redlining/component.js';
import PrintComponent from './components/print/component.js';
import SelectionWindowComponent from './components/selectionwindow/component.js';

import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import MessageManager from './tools/messagemanager.js';

// Register custom EPSG
// https://epsg.io/21781
proj4.defs('EPSG:21781', '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=660.077,13.551,369.344,2.484,1.783,2.939,5.66 +units=m +no_defs');
// https://epsg.io/2056
proj4.defs("EPSG:2056" , '+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs');
register(proj4);

// Initialize the singletons once
ConfigManager.getInstance().loadConfig();
MessageManager.getInstance();
UrlManager.getInstance([TreeViewComponent, MapComponent, ProjectionComponent, BasemapComponent, ThemeComponent, LanguageComponent]);
StateManager.getInstance();
I18nManager.getInstance();

document.addEventListener('DOMContentLoaded', function() {
  console.log('App initialized.');
});
