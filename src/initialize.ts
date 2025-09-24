import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import ConfigManager from './tools/configuration/configmanager';
import OfflineManager from './tools/offline/offlinemanager';
import ShareManager from './tools/share/sharemanager';
import StateManager from './tools/state/statemanager';
import ThemesManager from './tools/themes/themesmanager';
import LogManager from './tools/logging/logmanager';
import AuthManager from './tools/auth/authmanager';
import ErrorManager from './tools/error/errormanager';
import CsvManager from './tools/export/csvmanager';
import I18nManager from './tools/i18n/i18nmanager';
import WfsManager from './tools/wfs/wfsmanager';
import OrderingManager from './tools/ordering/orderingmanager';
import PluginManager from './tools/auth/pluginmanager';
import PermalinkManager from './tools/url/permalinkmanager';
import State from './tools/state/state';
import ApplicationLifeCycleManager from './tools/app/lifecyclemanager';
import SnapManager from './tools/layers/snapmanager';

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
    cordova: unknown;
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
  interface Navigator {
    connection: Connection;
  }
}

interface Connection {
  type: string;
}

async function waitForServiceWorkerActivation(): Promise<ServiceWorker> {
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

async function initializeServiceWorker() {
  const storeVersion: number = 6;
  const dbCacheName: string = 'geogirafe-cache';
  if (!navigator?.serviceWorker) {
    console.warn("Service worker not supported by your browser. Authentication and offline maps won't work");
    return;
  }

  let sw: ServiceWorker;
  try {
    sw = await waitForServiceWorkerActivation();
  } catch (err) {
    console.error('Service worker registration failed:', err);
    console.warn("Service worker could not be initialized. Authentication and offline maps won't work");
    return;
  }

  // Communicate logging configuration to service-worker
  const config = ConfigManager.getInstance().Config;
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
  await OfflineManager.getInstance().setServiceWorker(sw, storeVersion, dbCacheName);
  await AuthManager.getInstance().initialize(sw);
}

export async function initialize() {
  // First of all : Load the configuration
  await ConfigManager.getInstance().loadConfig();
  await LogManager.getInstance().initLogging();

  // Default configuration for Cesium (see https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/)
  window.CESIUM_BASE_URL = 'lib/cesium/';

  // Register Coordinate Reference Systems (CRS) definitions in PROJ4
  ConfigManager.getInstance().Config.crs.forEach((x) => {
    proj4.defs(x.code, x.definition);
  });

  register(proj4);

  // Register Service Worker
  await initializeServiceWorker();

  // Initialize the managers
  ApplicationLifeCycleManager.getInstance();
  ErrorManager.getInstance();
  CsvManager.getInstance();
  const i18nManager = I18nManager.getInstance();
  WfsManager.getInstance();
  OrderingManager.getInstance();
  PluginManager.getInstance();
  PermalinkManager.getInstance();
  SnapManager.getInstance();

  // Add the state to document, so that it will be accessible everywhere
  document.geogirafe = {
    state: StateManager.getInstance().state,
    stateManager: StateManager.getInstance(),
    shareManager: ShareManager.getInstance(),
    offlineManager: OfflineManager.getInstance(),
    themesManager: ThemesManager.getInstance(),
    configManager: ConfigManager.getInstance()
  };

  // Automatically toggle dark/light mode when changed in the system
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const state = StateManager.getInstance().state;
    if (e.matches) {
      state.interface.darkFrontendMode = true;
    } else {
      state.interface.darkFrontendMode = false;
    }
  });

  // Translate everything in body that is not a component
  const bodyElement = document.querySelector('body');
  if (bodyElement) {
    document.geogirafe.stateManager.subscribe('language', () => i18nManager.translate(bodyElement));
  }
}

export class SplashScreen {
  private splash?: HTMLElement;

  public begin() {
    document.addEventListener('DOMContentLoaded', () => {
      const element = document.getElementById('splash-screen');
      if (!element) {
        console.info('Nor SplashScreen found. Nothing to do.');
        return;
      }

      this.splash = element;
      // At this point, the config and translations have not been loaded yet
      // Therefore, we hardcode this simple 'loading' text and use the browser configuration
      this.setDefaultWaitingText();
    });
  }

  private setDefaultWaitingText() {
    const language = navigator.language.toLowerCase();
    console.debug(`Navigator language: ${language}`);
    let loading = 'Loading...';
    if (language.startsWith('fr')) {
      loading = 'Chargement...';
    } else if (language.startsWith('de')) {
      loading = 'Wird geladen...';
    } else if (language.startsWith('it')) {
      loading = 'Caricamento...';
    }
    (this.splash?.getElementsByTagName('span')[0] as HTMLElement).innerHTML = loading;
  }

  public end() {
    if (this.splash) {
      this.splash.style.opacity = '0';
      setTimeout(() => this.splash!.remove(), 700);
    }
  }
}

export function redirectTo(page: string) {
  const currentUrl = new URL(globalThis.location.href);
  const mobileUrl = new URL(page, globalThis.location.origin);

  const pathParts = currentUrl.pathname.split('/');
  pathParts[pathParts.length - 1] = page;
  mobileUrl.pathname = pathParts.join('/');

  mobileUrl.search = currentUrl.search;
  mobileUrl.hash = currentUrl.hash;
  globalThis.location.href = mobileUrl.toString();
}
