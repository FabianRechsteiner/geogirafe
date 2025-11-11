import proj4 from 'proj4';
import GirafeHTMLElement from '../base/GirafeHTMLElement';
import MapComponent from '../components/map/component';
import { register } from 'ol/proj/proj4';
import IGirafeContext from '../tools/context/icontext';
import GirafeApiContext from './apicontext';
import BasemapComponent from '../components/basemap/component';
import MenuButtonComponent from '../components/menubutton/component';
import { applyOpacityToLayers } from '../tools/utils/utils';

export default class GeoGirafeApi extends GirafeHTMLElement {
  constructor() {
    super('geogirafe-api');
    this.injectConfigMetaTags();
  }

  connectedCallback() {
    super.connectedCallback();
    this.initialize().then(() => {
      console.log('GeoGirafe API is ready!');
      this.defineApiComponents();
      this.subscribe('application.isReady', (_: boolean, isLoaded: boolean) => {
        if (isLoaded) {
          this.manageAttributes();
        }
      });
    });
  }

  override getInheritedContext(): IGirafeContext {
    return new GirafeApiContext();
  }

  private defineApiComponents() {
    if (!customElements.get('girafe-map')) {
      customElements.define('girafe-map', MapComponent);
    }
    this.shadow.innerHTML = `<girafe-map></girafe-map>`;
  }

  private manageAttributes() {
    this.manageCenterAttribute();
    this.manageZoomAttribute();
    this.manageBasemapAttribute();
    this.manageBasemapSelectorAttribute();
  }

  private manageCenterAttribute() {
    const center = this.getAttribute('center');
    if (center) {
      const coords = center.split(',');
      const x = Number(coords[0].trim());
      const y = Number(coords[1].trim());
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        this.context.stateManager.state.position.center = [x, y];
      } else {
        console.warn('Invalid center coordinates');
      }
    }
  }

  private manageZoomAttribute() {
    const zoom = this.getAttribute('zoom');
    if (zoom) {
      const zoomLevel = Number(zoom.trim());
      if (Number.isNaN(zoomLevel)) {
        console.warn('Invalid zoom level');
      } else {
        this.context.stateManager.state.position.zoom = zoomLevel;
      }
    }
  }

  private manageBasemapAttribute() {
    const basemap = this.getAttribute('basemap');
    if (basemap) {
      const basemapName = basemap.trim();
      if (basemapName) {
        // Find the basemap in the available basemaps
        const availableBasemap = Object.values(this.context.stateManager.state.basemaps).find(
          (b) => b.name === basemapName
        );
        if (availableBasemap) {
          applyOpacityToLayers(1, availableBasemap.layersList);
          this.context.stateManager.state.activeBasemaps = [availableBasemap];
        } else {
          console.warn(`Basemap '${basemapName}' not found in configuration`);
        }
      }
    }
  }

  private manageBasemapSelectorAttribute() {
    const basemapselector = this.getAttribute('basemapselector');
    if (basemapselector != null) {
      if (!customElements.get('girafe-menu-button')) {
        customElements.define('girafe-menu-button', MenuButtonComponent);
      }
      if (!customElements.get('girafe-basemap')) {
        customElements.define('girafe-basemap', BasemapComponent);
      }
      this.shadow.innerHTML += '<girafe-basemap></girafe-basemap>';
    }
  }

  private async initialize() {
    await this.context.initialize();

    // Register Coordinate Reference Systems (CRS) definitions in PROJ4
    for (const crs of this.context.configManager.Config.crs) {
      proj4.defs(crs.code, crs.definition);
    }
    register(proj4);

    // Tell the application it is initialized (no auth at the moment for the api)
    this.context.stateManager.state.application.isAuthInitialized = true;

    // Automatically toggle dark/light mode when changed in the system
    globalThis.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const state = this.context.stateManager.state;
      if (e.matches) {
        state.interface.darkFrontendMode = true;
      } else {
        state.interface.darkFrontendMode = false;
      }
    });
  }

  private injectConfigMetaTags() {
    const location = new URL(import.meta.url);
    if (import.meta.env.DEV) {
      location.pathname = location.pathname.replace('/src/api', '');
    }
    const origin = `${location.origin}${location.pathname.substring(0, location.pathname.lastIndexOf('/'))}`;
    const baseConfigUrl = `${origin}/config.json`;
    const apiConfigUrl = `${origin}/config.api.json`;

    if (!document.querySelector('meta[name="configs"]')) {
      const metaTag = document.createElement('meta');
      metaTag.name = 'configs';
      metaTag.content = 'main,api';
      document.head.appendChild(metaTag);

      const linkMain = document.createElement('link');
      linkMain.rel = 'config-main-url';
      linkMain.href = baseConfigUrl;
      document.head.appendChild(linkMain);

      const linkApi = document.createElement('link');
      linkApi.rel = 'config-api-url';
      linkApi.href = apiConfigUrl;
      document.head.appendChild(linkApi);
    }
  }
}
