import GirafeSingleton from '../../base/GirafeSingleton';
import GirafeConfig from './girafeconfig';
import { getPropertyByPath, setPropertyByPath, createObjectFromPath, deletePropertyByPath } from '../utils/pathUtils';

class ConfigManager extends GirafeSingleton {
  private config: GirafeConfig | null = null;
  // Config before applying user preferences
  private defaultConfig: GirafeConfig | null = null;
  private loadingPromise: Promise<GirafeConfig> | null = null;
  private readonly userPreferencesStorageKey: string = 'userPreferences';

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
      // Create a backup of the default config before applying custom user preferences
      this.defaultConfig = new GirafeConfig(structuredClone(jsonConfig));

      const userPreferences = this.loadUserPreferences();
      jsonConfig = this.mergeConfigs(jsonConfig, userPreferences);

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

  /**
   * Get the original config value from the config files(s) before any custom user preferences were applied
   */
  public getDefaultConfigValue(path: string): unknown {
    const result = getPropertyByPath(this.defaultConfig, path);
    if (result.found && result.parentObject && result.lastKey) {
      return result.parentObject[result.lastKey];
    }
  }

  /**
   * Load user preferences from the local browser storage.
   * @returns the user preference object containing all custom settings.
   */
  private loadUserPreferences(): Record<string, unknown> {
    const userPreferences = localStorage.getItem(this.userPreferencesStorageKey);
    return userPreferences ? JSON.parse(userPreferences) : {};
  }

  /**
   * Saves user preferences to the local storage.
   */
  public saveUserPreference(path: string, newValue: unknown): void {
    let userPreferences = this.loadUserPreferences() ?? {};
    const result = getPropertyByPath(userPreferences, path);
    if (!result.found) {
      // User preference does not exist yet, create it
      const newPreference: Record<string, unknown> = createObjectFromPath(path);
      userPreferences = this.mergeConfigs(userPreferences, newPreference);
    }
    if (setPropertyByPath(userPreferences, path, newValue)) {
      localStorage.setItem(this.userPreferencesStorageKey, JSON.stringify(userPreferences));
    }
  }

  /**
   * Delete a part of the user preferences in the local storage
   */
  public deleteUserPreference(path: string): void {
    const currentUserPreferences = this.loadUserPreferences() ?? {};
    deletePropertyByPath(currentUserPreferences, path);
    localStorage.setItem(this.userPreferencesStorageKey, JSON.stringify(currentUserPreferences));
  }

  /**
   * DANGER: Delete all custom user preferences including custom themes in the local storage
   */
  public deleteAllUserPreferences(): void {
    localStorage.removeItem(this.userPreferencesStorageKey);
  }
}

export default ConfigManager;
