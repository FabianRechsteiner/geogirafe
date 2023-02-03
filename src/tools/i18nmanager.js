import GeoEvents from '../models/events.js';
import MessageManager from './messagemanager';
import ConfigManager from './configmanager';

class I18nManager {

  static #instance = null;
  static #initializingSingleton = false;

  translations = {};
  currentLanguage = null;

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

  async loadTranslations() {
    if (this.currentLanguage in this.translations) {
      // Translation were already loaded.
      // => stop here
      return;
    }

    // Load translations
    await this.configManager.loadConfig();
    const url = this.configManager.Config.languages[this.currentLanguage];
    const response = await fetch(url);
    const content = await response.json();
    this.translations[this.currentLanguage] = content[this.currentLanguage];
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
    .then(() => {
      const toTranslate = dom.querySelectorAll('[i18n]');
      toTranslate.forEach(item => {
        const key = item.getAttribute('i18n');
        const translation = this.translations[this.currentLanguage][key];
        if (translation !== undefined && translation !== null) {
          item.innerHTML = translation;
        }
        else {
          // No translation found. We use the key as translation
          console.log('no translation for ' + key);
          item.innerHTML = key;
        }
      });
    });
  }
}

export default I18nManager;