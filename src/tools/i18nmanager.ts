import ConfigManager from './configmanager';
import StateManager from './state/statemanager';
import GirafeSingleton from '../base/GirafeSingleton';

/**
 * A dictionary that holds translation strings.
 * For example:
 * {
 *  'layer': 'couche'
 * }
 */
type TranslationsDict = {
  [lang: string]: string;
};

/**
 * A dictionary that holds all the languages with their translation strings.
 * For example:
 * {
 *   'fr': {
 *     'layer': 'couche'
 *   },
 * }
 */
type AvailableLanguages = {
  [lang: string]: TranslationsDict;
};

class I18nManager extends GirafeSingleton {
  translations: AvailableLanguages = {};
  loadingLanguagePromise: Promise<TranslationsDict> | null = null;

  configManager: ConfigManager;
  stateManager: StateManager;

  constructor(type: string) {
    super(type);

    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();
  }

  async #loadTranslations(language: string): Promise<TranslationsDict> {
    if (this.loadingLanguagePromise) {
      // There's already a promise for loading translations
      // => return it instead of starting another request
      return this.loadingLanguagePromise;
    }

    if (language in this.translations) {
      // Translation were already loaded.
      // => stop here
      return Promise.resolve(this.translations[language]);
    }

    // Load translations
    this.loadingLanguagePromise = this.configManager.loadConfig().then(async () => {
      if (this.configManager.Config && this.configManager.Config.languages) {
        const url = this.configManager.Config.languages[language];
        const response = await fetch(url);
        const content = await response.json();
        this.translations[language] = content[language];
        this.loadingLanguagePromise = null;
        return this.translations[language];
      } else {
        throw new Error('No languages found in config.json');
      }
    });

    return this.loadingLanguagePromise;
  }

  getTranslation(key: string) {
    const currentLanguage = this.stateManager?.state?.language ?? 'en';
    const translation = this.translations[currentLanguage][key];
    if (translation !== undefined && translation !== null) {
      return translation;
    }
    // console.log('no translation for ' + key);
    return key;
  }

  translate(dom: DocumentFragment) {
    if (this.stateManager.state && this.stateManager.state.language) {
      this.#loadTranslations(this.stateManager.state.language).then(() => {
        const toTranslate = dom.querySelectorAll('[i18n]');
        toTranslate.forEach((item) => {
          const key = item.getAttribute('i18n');
          if (key) {
            const translation = this.getTranslation(key);
            if (item.hasAttribute('placeholder')) {
              item.setAttribute('placeholder', translation);
            } else {
              // Default : simply set innerHTML.
              item.innerHTML = translation;
            }
          }
        });
      });
    }
  }
}

export default I18nManager;
