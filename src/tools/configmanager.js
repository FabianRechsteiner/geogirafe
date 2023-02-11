class ConfigManager {

  static #instance = null;
  static #initializingSingleton = false;
  static #config = null;
  static #locked = false;

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
    return new Promise(async(resolve) => {

      if (!ConfigManager.#locked) {
        ConfigManager.#locked = true;
        try {
          if (ConfigManager.#config === null) {
            // Load configuration
            console.log('Loading Application Configuration...')
            const response = await fetch('config.json');
            ConfigManager.#config = await response.json();
            console.log('Application Configuration loaded.')
            resolve();
          }
          else {
            resolve();
          }
        }
        finally {
          ConfigManager.#locked = false;
        }
      }
      else {
        setTimeout(() =>  {
          this.loadConfig().then(resolve);
        }, 100);
      }
    });
  }
}

export default ConfigManager