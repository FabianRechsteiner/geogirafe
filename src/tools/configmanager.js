class ConfigManager {

  static #instance = null;
  static #initializingSingleton = false;
  static #config = null;

  get Config() {
      return ConfigManager.#config;
  }

  constructor() {
    if (!ConfigManager.#initializingSingleton) {
      // If trying to create another instance
      throw new Error('This is a singleton. Please use the getInstance() method.');
    }
  }

  static getInstance() {
    if (ConfigManager.#instance === null) {
      // Singleton do not exists 
      // => create it
      ConfigManager.#initializingSingleton = true;
      try {
        ConfigManager.#instance = new ConfigManager();
      }
      finally {
        ConfigManager.#initializingSingleton = false;
      }
    }

    return ConfigManager.#instance;
  }

  async loadConfig() {
    if (ConfigManager.#config !== null) {
      // Configuration was already loaded
      return;
    }
    // Load configuration
    console.log('Loading Application Configuration...')
    const response = await fetch('config.json');
    ConfigManager.#config = await response.json();
    console.log('Application Configuration loaded.')
  }
}

export default ConfigManager