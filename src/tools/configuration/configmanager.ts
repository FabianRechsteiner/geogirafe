import GirafeSingleton from '../../base/GirafeSingleton';
import GirafeConfig from './girafeconfig';
import { getPropertyByPath, mergeObjects } from '../utils/pathUtils';

class ConfigManager extends GirafeSingleton {
  private config: GirafeConfig | null = null;
  // Backup of config before applying user overrides
  private defaultConfig: GirafeConfig | null = null;
  private loadingPromise: Promise<GirafeConfig> | null = null;
  private readonly storagePathForOverrides: string = 'configOverrides';

  public get Config() {
    return this.config!;
  }

  private getConfigUrls() {
    /*
    <meta name="configs" content="main,mobile" />
    <link rel="config-main-url" href="config.json" />
    <link rel="config-mobile-url" href="config.mobile.json" />
    */
    const configUrls = [];
    const configNames = document
      .querySelector('meta[name=configs]')
      ?.getAttribute('content')
      ?.split(',')
      .map((name) => name.trim());
    if (!configNames) {
      throw new Error("No configuration names found in 'configs' meta tag.");
    }
    for (const configName of configNames) {
      const configUrl = document.querySelector(`link[rel=config-${configName}-url]`)?.getAttribute('href');
      if (!configUrl) {
        throw new Error(`Configuration URL for '${configName}' not found in 'config-${configName}-url' meta tag.`);
      }
      configUrls.push(configUrl);
    }

    return configUrls;
  }

  public async loadConfig(): Promise<GirafeConfig> {
    if (this.loadingPromise) {
      // There's already a promise for loading the configuration
      // => return it instead of starting another request
      return this.loadingPromise;
    }

    if (this.config) {
      // Config was already loaded.
      return Promise.resolve(this.config);
    }

    this.loadingPromise = this.doLoadConfig();
    return this.loadingPromise;
  }

  private async doLoadConfig(): Promise<GirafeConfig> {
    // Load config
    const configUrls = this.getConfigUrls();
    let jsonConfig = {};

    for (const configUrl of configUrls) {
      try {
        const response = await fetch(configUrl);
        const newJsonConfig = await response.json();
        jsonConfig = this.mergeConfigs(jsonConfig, newJsonConfig);
      } catch {
        // TODO REG: Manage better the errors at the aplication start:
        // - the window.gAlert fuction should be callable at the very beggining of the app
        // - The ErrorManager should handled suches case, but it seems to be initialized too late.
        // - normal alerts seems to be blocked on mobile.
        const errorMessage = `Error while reading the configuration file ${configUrl}. Please verify your configuration.`;
        window.alert(errorMessage);
        throw new Error(errorMessage);
      }
    }

    // Create a backup of the default config before applying overrides
    this.defaultConfig = new GirafeConfig(structuredClone(jsonConfig as GirafeConfig));

    // Load config overrides and merge them with the default config
    const configOverrides = this.getConfigOverrides(this.defaultConfig.userdata.source);
    jsonConfig = this.mergeConfigs(jsonConfig, configOverrides);

    this.config = new GirafeConfig(jsonConfig as GirafeConfig);
    console.log('Application Configuration loaded.');
    return this.config;
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
    // Set the user data source first before requesting config overrides from the userDataManager
    this.context.userDataManager.setSource(userDataSource);
    return (this.context.userDataManager.getUserData(this.storagePathForOverrides) as Record<string, unknown>) || {};
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
