import GirafeSingleton from "../base/GirafeSingleton";

class ConfigManager extends GirafeSingleton {

  static #config = null;
  static #locked = false;

  get Config() {
      return ConfigManager.#config;
  }

  // TODO REG: Use the same async schema for loadConfig (like loadTranslation)
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