// SPDX-License-Identifier: Apache-2.0
import GeoGirafeAppComponent from './geogirafe-component';
import tippy from 'tippy.js';
import AboutComponent from '../../components/about/component';
import BasemapComponent from '../../components/basemap/component';
import CoordinateComponent from '../../components/coordinate/component';
import ContactComponent from '../../components/contact/component';
import MapDefaultContextMenuComponent from '../../components/context-menu/default-context-menu/component';
import MapCustomContextMenuComponent from '../../components/context-menu/custom-context-menu/component';
import CrossSectionSettingsComponent from '../../components/cross-section/cross-section-settings/component';
import CrossSectionViewComponent from '../../components/cross-section/cross-section-viewer/component';
import DrawingComponent from '../../components/drawing/component';
import EditComponent from '../../components/edit/component';
import EditFromComponent from '../../components/edit/editform/component';
import HelpComponent from '../../components/help/component';
import InfoboxComponent from '../../components/infobox/component';
import InfoWindowComponent from '../../components/infowindow/component';
import LayoutComponent from '../../components/layout/component';
import LRPanelComponent from '../../components/lr-panel/component';
import MapComponent from '../../components/map/component';
import MenuButtonComponent from '../../components/menubutton/component';
import ModalsComponent from '../../components/modals/component';
import NavigationComponent from '../../components/navigation/component';
import OauthComponent from '../../components/auth/component';
import PrintComponent from '../../components/print/component';
import PrototypeBannerComponent from '../../components/prototypebanner/component';
import QueryBuilderComponent from '../../components/querybuilder/component';
import ScaleComponent from '../../components/scale/component';
import SearchComponent from '../../components/search/component';
import SelectionGridComponent from '../../components/selectiongrid/component';
import SelectionWindowComponent from '../../components/selectionwindow/component';
import ShareComponent from '../../components/share/component';
import ExternalLayersComponent from '../../components/extlayers/component';
import ThemeComponent from '../../components/themes/component';
import TimeRestrictionComponent from '../../components/timerestriction/component';
import TimePickerComponent from '../../components/timerestriction/timepicker/component';
import TimeSliderComponent from '../../components/timerestriction/timeslider/component';
import TreeViewGroupComponent from '../../components/treeview/treeviewgroup/component';
import TreeViewItemComponent from '../../components/treeview/treeviewitem/component';
import TreeViewRootComponent from '../../components/treeview/treeviewroot/component';
import TreeViewThemeComponent from '../../components/treeview/treeviewtheme/component';
import UserPreferencesComponent from '../../components/userpreferences/component';
import VideoRecordComponent from '../../components/videorecord/component';
import { DrawingState } from '../../components/drawing/drawingFeature';
import DrawingSerializer from '../../components/drawing/drawingSerializer';
import { ShareState, ShareStateSerializer } from '../../components/share/sharestate';
import SelectionToolComponent from '../../components/selectiontool/component';

export default class GeoGirafeApp {
  private readonly readyPromise: Promise<void>;
  private resolveReady!: (value: void | PromiseLike<void>) => void;
  protected mainComponent!: GeoGirafeAppComponent;
  private readonly isIframe: boolean;

  public get context() {
    return this.mainComponent.getContext();
  }

  public constructor(isIframe: boolean = false) {
    this.isIframe = isIframe;
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });

    this.initialize();
  }

  public async isReady(): Promise<void> {
    return this.readyPromise;
  }

  protected async initialize() {
    this.defineMainComponent();
    await this.mainComponent.isReady();
    await this.initializeServiceWorker();
    this.initializeInterface();
    this.addCustomSerializers();
    this.context.stateManager.state.application.isCustomSerializerInitialized = true;
    this.defineCoreComponents();
    this.resolveReady();
  }

  protected defineMainComponent() {
    // Define custom element for the main application
    customElements.define('girafe-app', GeoGirafeAppComponent);
    this.mainComponent = document.querySelector('girafe-app') as GeoGirafeAppComponent;
    if (!this.mainComponent) {
      throw new Error('Application GeoGirafe not found. Please verify that the component is present in the HTML.');
    }
  }

  protected initializeInterface() {
    // Override default tooltip maxWidth:
    tippy.setDefaultProps({ maxWidth: '' });
  }

  protected addCustomSerializers() {
    // Add custom state and serializers (need to be done early, because the shared state will need them)
    this.context.stateManager.state.extendedState.drawing = new DrawingState();
    this.context.stateSerializer.addSerializer(DrawingState, new DrawingSerializer(this.context));
    this.context.stateManager.state.extendedState.share = new ShareState();
    this.context.stateSerializer.addSerializer(ShareState, new ShareStateSerializer(this.context, this.isIframe));
  }

  protected defineCoreComponents() {
    customElements.define('girafe-about', AboutComponent);
    customElements.define('girafe-basemap', BasemapComponent);
    customElements.define('girafe-coordinate', CoordinateComponent);
    customElements.define('girafe-contact', ContactComponent);
    customElements.define('girafe-default-context-menu', MapDefaultContextMenuComponent);
    customElements.define('girafe-custom-context-menu', MapCustomContextMenuComponent);
    customElements.define('girafe-layout', LayoutComponent);
    customElements.define('girafe-help', HelpComponent);
    customElements.define('girafe-infobox', InfoboxComponent);
    customElements.define('girafe-info-window', InfoWindowComponent);
    customElements.define('girafe-cross-section-settings', CrossSectionSettingsComponent);
    customElements.define('girafe-cross-section-view', CrossSectionViewComponent);
    customElements.define('girafe-lr-panel', LRPanelComponent);
    customElements.define('girafe-map', MapComponent);
    customElements.define('girafe-menu-button', MenuButtonComponent);
    customElements.define('girafe-modals', ModalsComponent);
    customElements.define('girafe-nav-history', NavigationComponent);
    customElements.define('girafe-print', PrintComponent);
    customElements.define('girafe-prototype-banner', PrototypeBannerComponent);
    customElements.define('girafe-query-builder', QueryBuilderComponent);
    customElements.define('girafe-oauth', OauthComponent);
    customElements.define('girafe-drawing', DrawingComponent);
    customElements.define('girafe-edit', EditComponent);
    customElements.define('girafe-edit-form', EditFromComponent);
    customElements.define('girafe-scale', ScaleComponent);
    customElements.define('girafe-search', SearchComponent);
    customElements.define('girafe-selection-tool', SelectionToolComponent);
    customElements.define('girafe-selection-grid', SelectionGridComponent);
    customElements.define('girafe-selection-window', SelectionWindowComponent);
    customElements.define('girafe-share', ShareComponent);
    customElements.define('girafe-ext-layer', ExternalLayersComponent);
    customElements.define('girafe-theme-select', ThemeComponent);
    customElements.define('girafe-time-restriction', TimeRestrictionComponent);
    customElements.define('girafe-time-picker', TimePickerComponent);
    customElements.define('girafe-time-slider', TimeSliderComponent);
    customElements.define('girafe-tree-view', TreeViewRootComponent);
    customElements.define('girafe-tree-view-group', TreeViewGroupComponent);
    customElements.define('girafe-tree-view-item', TreeViewItemComponent);
    customElements.define('girafe-tree-view-theme', TreeViewThemeComponent);
    customElements.define('girafe-user-preferences', UserPreferencesComponent);
    customElements.define('girafe-video-record', VideoRecordComponent);
  }

  private async initializeServiceWorker() {
    try {
      const storeVersion: number = 6;
      const dbCacheName: string = 'geogirafe-cache';
      if (globalThis.location.protocol !== 'https:') {
        throw new Error('Service worker registration not possible if the application is served over HTTP.');
      }
      if (!navigator?.serviceWorker) {
        throw new Error('Service worker not supported by your browser.');
      }

      let sw: ServiceWorker;
      try {
        sw = await this.waitForServiceWorkerActivation();
      } catch (err) {
        throw new Error(`Service worker registration failed. ${err}`);
      }

      // Communicate logging configuration to service-worker
      const config = this.context.configManager.Config;
      sw.postMessage({ logLevel: config.general.logLevel });

      // Communicate oauth configuration to service-worker
      const issuerConfig = config.oauth?.issuer ?? config.gmfauth;
      const gmfConfig = config.oauth?.geomapfish ?? config.gmfauth;
      if (issuerConfig && gmfConfig) {
        const issuerHostname = new URL(issuerConfig.url).hostname;
        const audience = [...issuerConfig.audience, issuerHostname];
        sw.postMessage({
          audience: audience,
          audienceExcludedPaths: issuerConfig.audienceExcludedPaths,
          authMode: gmfConfig.authMode,
          refererPolicy: gmfConfig.refererPolicy
        });
      }
      await this.context.offlineManager.setServiceWorker(sw, storeVersion, dbCacheName);
      await this.context.authManager.initialize(sw);
    } catch (e) {
      console.error("Service worker could not be initialized. Authentication and offline maps won't work.\n", e);
      // Finish auth initialization, since without a service worker auth isn't possible
      this.context.stateManager.state.application.isAuthInitialized = true;
    }
  }

  private async waitForServiceWorkerActivation(): Promise<ServiceWorker> {
    const registration = await navigator.serviceWorker.register('service-worker.js');
    if (registration.active) {
      return registration.active;
    }

    const sw = registration.installing || registration.waiting;
    if (!sw) {
      throw new Error('No service worker is installing or waiting.');
    }

    return new Promise((resolve) => {
      sw.addEventListener('statechange', function onStateChange() {
        if (sw.state === 'activated') {
          sw.removeEventListener('statechange', onStateChange);
          resolve(sw);
        }
      });
    });
  }
}
