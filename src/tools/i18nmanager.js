import GeoEvents from '../models/events.js';
import MessageManager from './messagemanager';
import ConfigManager from './configmanager';

class I18nManager {

  static #instance = null;
  static #initializingSingleton = false;

  translations = {};
  currentLanguage = null;
  loadingLanguagePromise = null;

  messageManager = null;
  configManager = null;

  constructor() {
    if (!I18nManager.#initializingSingleton) {
      // If trying to create another instance
      throw new Error('This is a singleton. Please use the getInstance() method.');
    }

    this.configManager = ConfigManager.getInstance();
    this.messageManager = MessageManager.getInstance();
    this.registerEvents();
  }

  static getInstance() {
    if (I18nManager.#instance === null) {
      // Singleton do not exists 
      // => create it
      I18nManager.#initializingSingleton = true;
      try {
        I18nManager.#instance = new I18nManager();
      }
      finally {
        I18nManager.#initializingSingleton = false;
      }
    }

    return I18nManager.#instance;
  }

  setDefaultLanguage(language) {
    this.currentLanguage = language;
    this.loadTranslations();
  }

  loadTranslations() {
    if (this.currentLanguage in this.translations) {
      // Translation were already loaded.
      // => stop here
      return Promise.resolve(this.translations[this.currentLanguage]);
    }

    if (this.loadingLanguagePromise) {
      // There's already a promise for loading translations
      // => return it instead of starting another request
      return this.loadingLanguagePromise;
    }

    // Load translations
    this.configManager.loadConfig();
    if (this.currentLanguage === null) {
      this.currentLanguage = this.configManager.Config.languages.default;
    }

    const url = this.configManager.Config.languages[this.currentLanguage];
    this.loadingLanguagePromise = fetch(url)
      .then((response) => response.json())
      .then((content) => {
        this.translations[this.currentLanguage] = content[this.currentLanguage];
        this.loadingLanguagePromise = null;
        return this.translations[this.currentLanguage];
      });
    
      return this.loadingLanguagePromise;
  }

  registerEvents() {
    //window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
    window.addEventListener(GeoEvents.Translate, (e) => this.onTranslateEvent(e.detail));
  }

  onTranslateEvent(details) {
    if (details.action === 'changeLanguage') {
      this.changeLanguage(details.language);
    }
  }

  changeLanguage(language) {
    this.currentLanguage = language;
    this.messageManager.sendMessage(GeoEvents.Translate, {action: 'languageChanged', language: language});
  }

  translate(dom) {
    this.loadTranslations()
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

export default I18nManager;
