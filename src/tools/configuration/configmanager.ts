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

  // TODO REG: With multiple interface (not only desktop and mobile)
  // We have to find another solution here.
  // Perhaps something more generic where we can pass a list of interfaces
  private isMobile: boolean = false;

  public initMobile() {
    this.isMobile = true;
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
      if (this.isMobile) {
        try {
          const responseMobile = await fetch('config.mobile.json');
          const jsonMobileConfig = await responseMobile.json();
          jsonConfig = this.mergeConfigs(jsonConfig, jsonMobileConfig);
        } catch {
          console.warn('No configuration found for mobile. Defaulting to desktop configuration.');
        }
      }
      // Create a backup of the default config before applying overrides
      this.defaultConfig = new GirafeConfig(structuredClone(jsonConfig));

      // Load config overrides and merge them with the default config
      const configOverrides = this.getConfigOverrides(this.defaultConfig.userdata.source);
      jsonConfig = this.mergeConfigs(jsonConfig, configOverrides);

      this.config = new GirafeConfig(jsonConfig);
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
