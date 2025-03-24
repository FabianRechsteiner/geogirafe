import tippy from 'tippy.js';
import BasemapComponent from './components/basemap/component';
import InfoboxComponent from './components/infobox/component';
import MapComponent from './components/map/component';
import { initialize } from './initialize';

// Common initialization
initialize().then(() => {
  // Override default tooltip maxWidth:
  tippy.setDefaultProps({ maxWidth: '' });

  // Define components names
  customElements.define('girafe-basemap', BasemapComponent);
  customElements.define('girafe-infobox', InfoboxComponent);
  customElements.define('girafe-map', MapComponent);

  // To prevent the FOUC effect (flash of unstyled content),
  // the html element is set to invisible when the application starts.
  // When all elements have been declared, the html element is made visible
  document.documentElement.style.opacity = '1';
});
