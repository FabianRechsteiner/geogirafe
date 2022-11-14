import GeoEvents from '/models/events.js';
import MessageManager from '/tools/messagemanager';

class I18nManager {

  static #instance = null;
  static #initializingSingleton = false;

  translations = {};
  currentLanguage = null;

  constructor() {
    if (!I18nManager.#initializingSingleton) {
      // If trying to create another instance
      throw new Error('This is a singleton. Please use the getInstance() method.');
    }

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
    const url = '/Mock/' + this.currentLanguage + '.json';
    const response = await fetch(url);
    const content = await response.json();
    this.translations[this.currentLanguage] = content;
  }

  registerEvents() {
    //window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
  }

  changeLanguage(language) {
    this.currentLanguage = language;
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