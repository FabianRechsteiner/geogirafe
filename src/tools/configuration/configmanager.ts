import GirafeSingleton from '../../base/GirafeSingleton';
import GirafeConfig from './girafeconfig';
import UserDataManager from '../userdata/userdatamanager';
import { getPropertyByPath, mergeObjects } from '../utils/pathUtils';

class ConfigManager extends GirafeSingleton {
  private config: GirafeConfig | null = null;
  // Backup of config before applying user overrides
  private defaultConfig: GirafeConfig | null = null;
  private loadingPromise: Promise<GirafeConfig> | null = null;
  private readonly storagePathForOverrides: string = 'configOverrides';

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
      const configNames = document
        .querySelector('meta[name=configs]')
        ?.getAttribute('content')
        ?.split(',')
        .map((name) => name.trim());
      if (!configNames) {
        throw new Error("No configuration names found in 'configs' meta tag.");
      }
      let jsonConfig = {};
      for (const configName of configNames) {
        const configUrl = document.querySelector(`link[rel=config-${configName}-url]`)?.getAttribute('href');
        if (!configUrl) {
          throw new Error(`Configuration URL for '${configName}' not found in 'config-${configName}-url' meta tag.`);
        }
        const response = await fetch(configUrl);
        const newJsonConfig = await response.json();
        jsonConfig = this.mergeConfigs(jsonConfig, newJsonConfig);
      }
      // Create a backup of the default config before applying overrides
      this.defaultConfig = new GirafeConfig(structuredClone(jsonConfig as GirafeConfig));

      // Load config overrides and merge them with the default config
      const configOverrides = this.getConfigOverrides(this.defaultConfig.userdata.source);
      jsonConfig = this.mergeConfigs(jsonConfig, configOverrides);

      this.config = new GirafeConfig(jsonConfig as GirafeConfig);
      console.log('Application Configuration loaded.');
      return this.config;
    })();

    return this.loadingPromise;
  }

  /**
   * Merges two configuration objects recursively.
   */
  private mergeConfigs(obj1: Record<string, unknown>, obj2: Record<string, unknown>) {
    return mergeObjects(obj1, obj2);
  }

  /**
   * Retrieves saved configuration overrides based on the user data source.
   * @param userDataSource The source of user data.
   */
  private getConfigOverrides(userDataSource: string) {
    const userDataManager = UserDataManager.getInstance();
    // Set the user data source first before requesting config overrides from the userDataManager
    userDataManager.setSource(userDataSource);
    return (userDataManager.getUserData(this.storagePathForOverrides) as Record<string, unknown>) || {};
  }

  /**
   * Retrieves the original (default) configuration value before applying overrides.
   * @param path The path to the configuration property.
   */
  public getDefaultConfigValue(path: string): unknown {
    const { found, parentObject, lastKey } = getPropertyByPath(this.defaultConfig, path);
    return found && parentObject && lastKey ? parentObject[lastKey] : undefined;
  }
}

export default ConfigManager;
