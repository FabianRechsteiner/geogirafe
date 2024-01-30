import GirafeSingleton from '../../base/GirafeSingleton';
import GirafeConfig from './girafeconfig';

class ConfigManager extends GirafeSingleton {
  private config: GirafeConfig | null = null;
  private loadingPromise: Promise<GirafeConfig> | null = null;

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
    console.log('Loading Application Configuration...');
    this.loadingPromise = fetch('config.json')
      .then((response) => response.json())
      .then((jsonConfig) => {
        this.config = new GirafeConfig(jsonConfig);
        console.log('Application Configuration loaded.');
        return this.config;
      });

    return this.loadingPromise;
  }
}

export default ConfigManager;
