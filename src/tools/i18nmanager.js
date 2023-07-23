import ConfigManager from './configmanager';
import StateManager from './state/statemanager';
import GirafeSingleton from '../base/GirafeSingleton';

class I18nManager extends GirafeSingleton {

  translations = {};
  loadingLanguagePromise = null;

  configManager = null;
  stateManager = null;

  constructor(type) {
    super(type);

    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();
  }

  #loadTranslations(language) {
    if (language in this.translations) {
      // Translation were already loaded.
      // => stop here
      return Promise.resolve(this.translations[language]);
    }

    if (this.loadingLanguagePromise) {
      // There's already a promise for loading translations
      // => return it instead of starting another request
      return this.loadingLanguagePromise;
    }

    // Load translations
    this.configManager.loadConfig();
    const url = this.configManager.Config.languages[language];
    this.loadingLanguagePromise = fetch(url)
      .then((response) => response.json())
      .then((content) => {
        this.translations[language] = content[language];
        this.loadingLanguagePromise = null;
        return this.translations[language];
      });
    
      return this.loadingLanguagePromise;
  }

  getTranslation(key) {
    const translation = this.translations[this.stateManager.state.language][key];
    if (translation !== undefined && translation !== null) {
      return translation;
    }
    // console.log('no translation for ' + key);
    return key;
  }

  translate(dom) {
    if (this.stateManager.state.language != null) {
      this.#loadTranslations(this.stateManager.state.language)
        .then((translations) => {
          const toTranslate = dom.querySelectorAll('[i18n]');
          toTranslate.forEach(item => {
            const key = item.getAttribute('i18n');
            const translation = this.getTranslation(key);
            if (item.hasAttribute('placeholder')) {
              item.setAttribute('placeholder', translation);
            }
            else {
              // Default : simply set innerHTML.
              item.innerHTML = translation;
            }
          });
        });
    }
  }
}

export default I18nManager;
