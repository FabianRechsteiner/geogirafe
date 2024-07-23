import GirafeSingleton from '../../base/GirafeSingleton';
import GirafeConfig from './girafeconfig';

class ConfigManager extends GirafeSingleton {
  private config: GirafeConfig | null = null;
  private loadingPromise: Promise<GirafeConfig> | null = null;

  // TODO REG: With multiple interface (not only desktop and mobile)
  // We have to find another solution here.
  // Perhaps something more generic where we can pass a list of interfaces
  private static isMobile: boolean = false;
  public static initMobile() {
    ConfigManager.isMobile = true;
  }

  get Config() {
    return this.config!;
  }

  public async loadConfig(): Promise<GirafeConfig> {
    if (this.loadingPromise) {
      // There's already a promise for loading the configuration
      // => return it instead of starting another request
      return this.loadingPromise;
    }

    if (this.config) {
      // Config was already loaded.
      // => stop here
      return Promise.resolve(this.config);
    }

    // Load config
    this.loadingPromise = (async () => {
      const response = await fetch('config.json');
      let jsonConfig = await response.json();
      if (ConfigManager.isMobile) {
        try {
          const responseMobile = await fetch('config.mobile.json');
          const jsonMobileConfig = await responseMobile.json();
          jsonConfig = this.mergeConfigs(jsonConfig, jsonMobileConfig);
        } catch {
          console.warn('No configuration found for mobile. Defaulting to desktop configuration.');
        }
      }

      this.config = new GirafeConfig(jsonConfig);
      console.log('Application Configuration loaded.');
      return this.config;
    })();

    return this.loadingPromise;
  }

  private mergeConfigs(obj1: Record<string, unknown>, obj2: Record<string, unknown>) {
    for (const key in obj2) {
      if (Object.prototype.hasOwnProperty.call(obj1, key)) {
        // NOSONAR: Can be solved when migrating to ES2022
        if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
          this.mergeConfigs(obj1[key] as Record<string, unknown>, obj2[key] as Record<string, unknown>);
        } else {
          obj1[key] = obj2[key];
        }
      } else {
        obj1[key] = obj2[key];
      }
    }
    return obj1;
  }
}

export default ConfigManager;
