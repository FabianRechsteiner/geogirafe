import GirafeSingleton from '../../base/GirafeSingleton';
import IGirafeContext from '../context/icontext';

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

  constructor(context: IGirafeContext) {
    super(context);
  }

  override initializeSingleton(): void {
    this.context.stateManager.subscribe('language', () => this.handleLanguageChange());
    this.handleLanguageChange();
  }

  formatNumber(number: string | number): string {
    return Number.parseFloat(`${number}`).toLocaleString(this.context.configManager.Config.general.locale);
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
    this.loadingLanguagePromise = this.context.configManager.loadConfig().then(async () => {
      if (
        this.context.configManager.Config?.languages.translations &&
        language in this.context.configManager.Config.languages.translations
      ) {
        let mergedTranslations: TranslationsDict = {};
        // Translations are loaded in the order defined in the list of files
        // If an element is present in both results, the last value overwrite all the others
        for (const url of this.context.configManager.Config.languages.translations[language]) {
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
    const currentLanguage = this.context.stateManager?.state?.language ?? 'en';
    const translationDict = this.translations[currentLanguage];
    const translation = translationDict ? translationDict[key] : null;
    if (translation !== undefined && translation !== null) {
      return translation;
    }
    return key;
  }

  async translate(dom: DocumentFragment | HTMLElement): Promise<void> {
    if (!this.context.stateManager.state?.language) {
      return;
    }

    try {
      await this.loadTranslations(this.context.stateManager.state.language);
    } catch (err) {
      console.warn('Skipping translation due to config error:', err);
      return;
    }

    const toTranslate = dom.querySelectorAll('[i18n]');
    toTranslate.forEach((item) => {
      const key = item.getAttribute('i18n');
      let translation: string;
      if (item.hasAttribute('i18nFn')) {
        translation = this.getFnTranslated(item, key!);
      } else {
        translation = this.getTranslation(key!);
      }
      if (item.hasAttribute('placeholder')) {
        item.setAttribute('placeholder', translation);
      } else {
        // Default : simply set innerHTML.
        item.innerHTML = translation;
      }
    });

    const tooltips = dom.querySelectorAll('[tip]');
    tooltips.forEach((item) => {
      const key = item.getAttribute('tip');
      const translation = this.getTranslation(key!);
      item.setAttribute('title', translation);
    });
  }

  handleLanguageChange() {
    const newLanguage = this.context.stateManager.state.language;
    if (!newLanguage) {
      return;
    }
    const htmlLangElement = document.querySelector('html[lang]');
    htmlLangElement?.setAttribute('lang', newLanguage);
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
