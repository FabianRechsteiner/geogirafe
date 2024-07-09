import ConfigManager from '../configuration/configmanager';
import GirafeConfig from '../configuration/girafeconfig';
import I18nManager from '../i18n/i18nmanager';

class MockHelper {
  public static mockConfig = {
    general: {
      locale: 'en-US'
    },
    languages: {
      translations: {
        fr: ['Mock/fr.json']
      },
      defaultLanguage: 'fr'
    },
    themes: {
      url: 'Mock/themes.json'
    },
    projections: {
      'EPSG:3857': 'W-M'
    },
    map: {
      srid: 'EPSG:2056',
      scales: [1000000, 500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200],
      startPosition: '2628597,1186378',
      startZoom: '3',
      maxExtent: '2200000,1040000,3000000,1310000'
    },
    search: {
      url: 'https://search.url?query=###SEARCHTERM###'
    },
    share: {
      createUrl: 'https://share.url'
    },
    print: {
      url: 'https://print.url'
    },
    offline: {
      downloadStartZoom: 5,
      downloadEndZoom: 8
    }
  };

  public static startMocking() {
    // @ts-ignore
    ConfigManager.getInstance().config = new GirafeConfig(MockHelper.mockConfig);
    I18nManager.getInstance().translations = { fr: { a: 'translated_a', b: 'translated_b' } };
  }

  public static stopMocking() {
    // @ts-ignore
    ConfigManager.getInstance().config = null;
  }
}

export default MockHelper;
