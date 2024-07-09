import ConfigManager from '../configuration/configmanager';
import StateManager from '../state/statemanager';
import GirafeSingleton from '../../base/GirafeSingleton';

/**
 * A dictionary that holds translation strings.
 * For example:
 * {
 *  'layer': 'couche'
 * }
 */
export type TranslationsDict = {
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

  formatNumber(number: string | number): string {
    return parseFloat(`${number}`).toLocaleString(this.configManager.Config.general.locale);
  }

  private async loadTranslations(language: string): Promise<TranslationsDict> {
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
      if (
        this.configManager.Config?.languages.translations &&
        language in this.configManager.Config.languages.translations
      ) {
        let mergedTranslations: TranslationsDict = {};
        // Translations are loaded in the order defined in the list of files
        // If an element is present in both results, the last value overwrite all the others
        for (const url of this.configManager.Config.languages.translations[language]) {
          const response = await fetch(url);
          const content = await response.json();
          mergedTranslations = { ...mergedTranslations, ...content[language] };
        }

        this.translations[language] = mergedTranslations;
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
    const translationDict = this.translations[currentLanguage];
    const translation = translationDict ? translationDict[key] : null;
    if (translation !== undefined && translation !== null) {
      return translation;
    }
    return key;
  }

  async translate(dom: DocumentFragment): Promise<void> {
    if (!this.stateManager.state?.language) {
      return;
    }

    await this.loadTranslations(this.stateManager.state.language);

    const toTranslate = dom.querySelectorAll('[i18n]');
    toTranslate.forEach((item) => {
      const key = item.getAttribute('i18n');
      if (!key) {
        return;
      }
      let translation: string;
      if (item.hasAttribute('i18nFn')) {
        translation = this.getFnTranslated(item, key);
      } else {
        translation = this.getTranslation(key);
      }
      if (item.hasAttribute('placeholder')) {
        item.setAttribute('placeholder', translation);
      } else {
        // Default : simply set innerHTML.
        item.innerHTML = translation;
      }
    });
  }

  private getFnTranslated(item: Element, key: string): string {
    const fnName = item.getAttribute('i18nFn');
    if (fnName === 'formatNumber') {
      return this.formatNumber(key);
    }
    return key;
  }
}

export default I18nManager;
