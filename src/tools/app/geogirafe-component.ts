import proj4 from 'proj4';
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import IGirafeContext from '../context/icontext';
import { register } from 'ol/proj/proj4';
import GirafeContext from '../context/context';

export default class GeoGirafeAppComponent extends GirafeHTMLElement {
  private readonly ready: Promise<void>;
  private resolveReady!: () => void;

  public constructor() {
    super('geogirafe-main-app');
    this.shadow.innerHTML = '<slot></slot>';
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
  }

  public getContext() {
    return this.context;
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.initialize().then(() => {
      // App is ready
      this.resolveReady();
    });
  }

  public override getInheritedContext(): IGirafeContext {
    return new GirafeContext();
  }

  public isReady(): Promise<void> {
    return this.ready;
  }

  private async initialize() {
    await this.context.initialize();

    // Default configuration for Cesium (see https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/)
    window.CESIUM_BASE_URL = 'lib/cesium/';

    // Register Coordinate Reference Systems (CRS) definitions in PROJ4
    for (const crs of this.context.configManager.Config.crs) {
      proj4.defs(crs.code, crs.definition);
    }
    register(proj4);

    document.geogirafe = {
      context: this.context,
      state: this.context.stateManager.state
    };

    // Automatically toggle dark/light mode when changed in the system
    globalThis.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const state = this.context.stateManager.state;
      if (e.matches) {
        state.interface.darkFrontendMode = true;
      } else {
        state.interface.darkFrontendMode = false;
      }
    });

    // Translate everything in body that is not a component
    // TODO REG : Do we still need this ? Probably not
    /*const bodyElement = document.querySelector('body');
    if (bodyElement) {
      document.geogirafe.stateManager.subscribe('language', () => i18nManager.translate(bodyElement));
    }*/
  }
}
