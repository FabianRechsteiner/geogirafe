import './components/treeview/component.js';
import './components/map/component.js';
import './components/search/component.js';
import './components/projection/component.js';

import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import GeoEvents from '/models/events.js';

// Register custom EPSG
// https://epsg.io/21781
proj4.defs('EPSG:21781', '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=660.077,13.551,369.344,2.484,1.783,2.939,5.66 +units=m +no_defs');
// https://epsg.io/2056
proj4.defs("EPSG:2056" , '+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs');
register(proj4);

document.addEventListener('DOMContentLoaded', function() {
  console.log('App initialized.');
  // window.dispatchEvent(new CustomEvent(GeoEvents.App, { 
  //   bubbles: true, cancelable: false, composed: true, 
  //   detail: {
  //     action: 'appInitialized'
  //   }
  // }));
});