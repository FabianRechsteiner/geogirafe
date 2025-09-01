import tippy from 'tippy.js';
import BasemapComponent from './components/basemap/component';
import InfoboxComponent from './components/infobox/component';
import MapComponent from './components/map/component';
import { initialize, SplashScreen } from './initialize';

// Display the splash-screen
const splash = new SplashScreen();
splash.begin();

// Common initialization
initialize().then(() => {
  // Override default tooltip maxWidth:
  tippy.setDefaultProps({ maxWidth: '' });

  // Define components names
  customElements.define('girafe-basemap', BasemapComponent);
  customElements.define('girafe-infobox', InfoboxComponent);
  customElements.define('girafe-map', MapComponent);

  // Remove the splash-screen
  splash.end();
});
