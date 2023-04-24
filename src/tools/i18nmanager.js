import ConfigManager from './configmanager';
import StateManager from './state/statemanager.js';
import GirafeSingleton from '../base/GirafeSingleton.js';

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

  translate(dom) {
    if (this.stateManager.state.language != null) {
      this.#loadTranslations(this.stateManager.state.language)
        .then((translations) => {
          const toTranslate = dom.querySelectorAll('[i18n]');
          toTranslate.forEach(item => {
            const key = item.getAttribute('i18n');
            const translation = translations[key];
            if (translation !== undefined && translation !== null) {
              if (item.hasAttribute('placeholder')) {
                item.setAttribute('placeholder', translation);
              }
              else {
                // Default : simply set innerHTML.
                item.innerHTML = translation;
              }
            }
            else {
              // No translation found. We use the key as translation
              // console.log('no translation for ' + key);
              item.innerHTML = key;
            }
          });
        });
    }
  }
}

export default I18nManager;
