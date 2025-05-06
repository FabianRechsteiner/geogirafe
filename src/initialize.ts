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
import State from './tools/state/state';

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

async function initializeServiceWorker() {
  const storeVersion: number = 6;
  const dbCacheName: string = 'geogirafe-cache';
  if (!navigator?.serviceWorker) {
    console.warn("Service worker could not be initialized. Authentication and offline maps won't work");
    return;
  }

  const registration = await navigator.serviceWorker.register('service-worker.js');
  if (!registration.active) {
    console.warn("Service worker could not be initialized. Authentication and offline maps won't work");
    return;
  }

  // Communicate logging configuration to service-worker
  const config = ConfigManager.getInstance().Config;
  registration.active.postMessage({ logLevel: config.general.logLevel });

  // Communicate oauth configuration to service-worker
  const issuerConfig = config.oauth?.issuer ?? config.gmfauth;
  const gmfConfig = config.oauth?.geomapfish ?? config.gmfauth;
  if (issuerConfig && gmfConfig) {
    const issuerHostname = new URL(issuerConfig.url).hostname;
    const audience = [...issuerConfig.audience, issuerHostname];
    registration.active.postMessage({
      audience: audience,
      audienceExcludedPaths: issuerConfig.audienceExcludedPaths,
      authMode: gmfConfig.authMode,
      refererPolicy: gmfConfig.refererPolicy
    });
  }
  await OfflineManager.getInstance().setServiceWorker(registration.active, storeVersion, dbCacheName);
  await AuthManager.getInstance().initialize(registration.active);
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
  ErrorManager.getInstance();
  CsvManager.getInstance();
  I18nManager.getInstance();
  WfsManager.getInstance();
  OrderingManager.getInstance();
  await ThemesManager.getInstance().initialize();

  // Add the state to document, so that it will be accessible everywhere
  document.geogirafe = {
    state: StateManager.getInstance().state,
    stateManager: StateManager.getInstance(),
    shareManager: ShareManager.getInstance(),
    offlineManager: OfflineManager.getInstance(),
    themesManager: ThemesManager.getInstance(),
    configManager: ConfigManager.getInstance()
  };
}
