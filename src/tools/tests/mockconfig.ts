export const MockConfig = {
  general: {
    locale: 'en-US',
    logLevel: 'debug'
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
  basemaps: {
    defaultBasemap: 'Grundkarte farbig',
    OSM: false,
    SwissTopoVectorTiles: true
  },
  projections: {
    'EPSG:2056': 'LV95',
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
  },
  lidar: {
    url: 'https://pytree.test.url'
  },
  userdata: {
    source: 'localStorage'
  },
  crs: [
    {
      code: 'EPSG:2056',
      definition:
        '+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs'
    }
  ]
};
