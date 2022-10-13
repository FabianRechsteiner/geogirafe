import GeoEvents from '/models/events.js';
import MessageManager from '/tools/messagemanager';

class I18nManager {

  static #instance = null;
  static #initializingSingleton = false;

  translations = null;

  constructor() {
    if (!I18nManager.#initializingSingleton) {
      // If trying to create another instance
      throw new Error('This is a singleton. Please use the getInstance() method.');
    }

    this.messageManager = MessageManager.getInstance();
    this.loadTranslations();
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

  loadTranslations() {
    fetch('/Mock/de.json')
        .then(response => response.json())
        .then(translations => this.translations = translations);
  }

  registerEvents() {
    //window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
  }

  translate(dom, language) {
    const toTranslate = dom.querySelectorAll('[i18n="girafe"]');
    toTranslate.forEach(item => {
      const key = item.innerHTML;
      const translation = this.translations[key];
      if (translation !== undefined && translation !== null) {
        item.innerHTML = translation;
      }
    });
  }
}

export default I18nManager;