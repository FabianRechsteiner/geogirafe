// SPDX-License-Identifier: Apache-2.0
import proj4 from 'proj4';
import GirafeHTMLElement from '../base/GirafeHTMLElement';
import MapComponent from '../components/map/component';
import { register } from 'ol/proj/proj4';
import IGirafeContext from '../tools/context/icontext';
import GirafeApiContext from './apicontext';
import BasemapComponent from '../components/basemap/component';
import MenuButtonComponent from '../components/menubutton/component';
import MapCustomContextMenuComponent from '../components/context-menu/custom-context-menu/component';
import SearchComponent from '../components/search/component';
import SelectionWindowComponent from '../components/selectionwindow/component';

export default class GeoGirafeApi extends GirafeHTMLElement {
  protected override templateUrl = './template.html';
  protected override styleUrls = ['../styles/common.css', './style.css'];

  private isInitialized = false;

  public constructor() {
    super('geogirafe-api');
    this.injectConfigMetaTags();
  }

  private get config() {
    return this.context.configManager.Config.api!.demo;
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.initialize().then(() => {
      console.log('GeoGirafe API is ready!');
      this.defineApiComponents();
      this.subscribe('application.isReady', (_: boolean, isLoaded: boolean) => {
        if (isLoaded) {
          this.manageAttributes();
          this.isInitialized = true;
          this.dispatchEvent(new CustomEvent('geogirafe-api-ready'));
        }
      });
      this.render();
    });
  }

  public static get observedAttributes() {
    return ['center', 'zoom', 'basemap', 'basemapselector', 'crosshair', 'tooltip', 'markers', 'layers'];
  }

  protected attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (this.isInitialized) {
      // We listen to attribute changes only if the API is already initialized
      console.log(`Attribute ${name} changed : ${oldValue} → ${newValue}`);
      if (name === 'center') {
        this.manageCenterAttribute();
      } else if (name === 'zoom') {
        this.manageZoomAttribute();
      } else if (name === 'basemap') {
        this.manageBasemapAttribute();
      } else if (name === 'basemapselector') {
        this.manageBasemapSelectorAttribute();
      } else if (name === 'crosshair') {
        this.manageCrosshairAttribute();
      } else if (name === 'tooltip') {
        this.manageTooltipAttribute();
      } else if (name === 'markers') {
        this.manageMarkersAttribute();
      } else if (name === 'layers') {
        this.manageLayersAttribute();
      }
    }
  }

  protected override getInheritedContext(): IGirafeContext {
    return new GirafeApiContext();
  }

  private defineApiComponents() {
    if (!customElements.get('girafe-map')) {
      customElements.define('girafe-map', MapComponent);
    }
  }

  private manageAttributes() {
    this.manageCenterAttribute();
    this.manageZoomAttribute();
    this.manageBasemapAttribute();
    this.manageBasemapSelectorAttribute();
    this.manageSearchbarAttribute();
    this.manageCrosshairAttribute();
    this.manageTooltipAttribute();
    this.manageMarkersAttribute();
    this.manageLayersAttribute();
    this.manageSelectionboxAttribute();

    this.manageUserInteraction();
  }

  private manageUserInteraction() {
    // Deacivate the preview of search results
    this.context.configManager.Config.search.objectPreview = false;
    this.context.configManager.Config.search.layerPreview = false;

    // Force window as selection component
    this.state.interface.selectionComponent = 'window';

    // Deactivate selection if the selectionbox is not active
    const selectionbox = this.getAttribute('selectionbox');
    if (selectionbox === null) {
      this.context.userInteractionManager.registerListener('map.select', true, 'api');
    }
  }

  private getAttributeFromConfig(attributeName: string): string | null {
    let attributeValue = this.getAttribute(attributeName);
    if (!attributeValue) {
      return null;
    }

    if (attributeValue.startsWith('api.demo.')) {
      const configName = attributeValue.replace('api.demo.', '');
      attributeValue = (this.config as Record<string, string>)[configName];
      this.setAttribute(attributeName, attributeValue);
    }
    return attributeValue;
  }

  private defineAndAddComponent(customElementName: string, customElementType: CustomElementConstructor) {
    if (!customElements.get(customElementName)) {
      customElements.define(customElementName, customElementType);
    }
    const existingElement = this.shadowRoot?.querySelector(customElementName);
    if (!existingElement) {
      const component = new customElementType();
      this.shadow.appendChild(component);
    }
  }

  private manageCenterAttribute() {
    const center = this.getAttributeFromConfig('center');
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
    const zoom = this.getAttributeFromConfig('zoom');
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
    const basemap = this.getAttributeFromConfig('basemap');
    if (basemap) {
      const basemapName = basemap.trim();
      if (basemapName) {
        // Find the basemap in the available basemaps
        const availableBasemap = Object.values(this.context.stateManager.state.basemaps).find(
          (b) => b.name === basemapName
        );
        if (availableBasemap) {
          // Force opacity to 1 for the API
          availableBasemap.opacity = 1;
          this.context.stateManager.state.activeBasemaps = [availableBasemap];
        } else {
          console.warn(`Basemap '${basemapName}' not found in configuration`);
        }
      }
    }
  }

  private manageLayersAttribute() {
    const layers = this.getAttributeFromConfig('layers');
    if (layers) {
      const layerNames = layers.split(',');
      for (const layerName of layerNames) {
        if (!this.context.themesHelper.addLayerFromName(layerName.trim())) {
          console.warn(`Cannot add layer ${layerName.trim()}`);
        }
      }
    }
  }

  private manageBasemapSelectorAttribute() {
    const basemapselector = this.getAttribute('basemapselector');
    if (basemapselector != null) {
      this.defineAndAddComponent('girafe-menu-button', MenuButtonComponent);
      this.defineAndAddComponent('girafe-basemap', BasemapComponent);
    }
  }

  private manageSearchbarAttribute() {
    const searchbar = this.getAttribute('searchbar');
    if (searchbar != null) {
      this.defineAndAddComponent('girafe-search', SearchComponent);
    }
  }

  private manageSelectionboxAttribute() {
    const selectionbox = this.getAttribute('selectionbox');
    if (selectionbox != null) {
      this.defineAndAddComponent('girafe-selection-window', SelectionWindowComponent);
    }
  }

  private manageCrosshairAttribute() {
    const crosshair = this.getAttributeFromConfig('crosshair');
    if (crosshair) {
      const coords = crosshair.split(',');
      const x = Number(coords[0].trim());
      const y = Number(coords[1].trim());
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        this.context.stateManager.state.position.crosshair = [x, y];
      } else {
        console.warn('Invalid crosshair coordinates');
      }
    }
  }

  private manageTooltipAttribute() {
    const tooltip = this.getAttributeFromConfig('tooltip');
    if (tooltip) {
      this.defineAndAddComponent('girafe-custom-context-menu', MapCustomContextMenuComponent);
      const content = tooltip.split('|');
      const coords = content[0].split(',');
      const x = Number(coords[0].trim());
      const y = Number(coords[1].trim());
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        const text = content[1];
        this.context.stateManager.state.position.tooltip = {
          position: [x, y],
          content: text
        };
      } else {
        console.warn('Invalid tooltip coordinates');
      }
    }
  }

  private manageMarkersAttribute() {
    const markers = this.getAttributeFromConfig('markers');
    if (markers) {
      const markerValues = markers.split(';');
      for (const makerValue of markerValues) {
        const content = makerValue.split('|');
        const coords = content[0].split(',');
        const x = Number(coords[0].trim());
        const y = Number(coords[1].trim());
        if (!Number.isNaN(x) && !Number.isNaN(y)) {
          const imageUrl = content[1].trim();
          this.context.stateManager.state.position.markers.push({
            position: [x, y],
            imageUrl: imageUrl
          });
        } else {
          console.warn('Invalid marker coordinates');
        }
      }
    }
  }

  private async initialize() {
    await this.context.initialize();

    // Register Coordinate Reference Systems (CRS) definitions in PROJ4
    for (const crs of this.context.configManager.Config.crs) {
      proj4.defs(crs.code, crs.definition);
    }
    register(proj4);

    // No custom serializer for the API
    this.context.stateManager.state.application.isCustomSerializerInitialized = true;
    // No auth for the api
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
    // The 2 following lines are a small hack to make the api interface work in both context
    // (debugging in vite + production app)
    location.pathname = location.pathname.replace('/src/api', '');
    location.pathname = location.pathname.replace('/node_modules/.vite/deps', '');

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
