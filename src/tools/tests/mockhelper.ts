import ConfigManager from '../configuration/configmanager';
import GirafeConfig from '../configuration/girafeconfig';
import { ServerOgc } from '../state/state';

class MockHelper {
  public static mockConfig = {
    general: {
      locale: 'en-US'
    },
    languages: {
      fr: 'Mock/fr.json',
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
    }
  };

  public static startMocking() {
    // @ts-ignore
    ConfigManager.getInstance().config = new GirafeConfig(MockHelper.mockConfig);
  }

  public static stopMocking() {
    // @ts-ignore
    ConfigManager.getInstance().config = null;
  }

  public static getServerOgc(): ServerOgc {
    return {
      url: 'https://test.com',
      urlWfs: 'https://test.com/wfs',
      wfsSupport: true,
      imageType: 'image/jpg',
      type: 'mapserver'
    };
  }
}

export default MockHelper;
