/*
  This is the whole configuration of the GeoGirafe Viewer. 
  Here, you can set the entries according to your environment.
*/
const GeoConfig = {
  languages: {
    /* List of languages with their corresponding translation-file. */
    de: 'https://pi.paloo.fr/mapbs/static-ngeo/build/de.json',
    en: 'https://pi.paloo.fr/mapbs/static-ngeo/build/en.json',
    fr: 'https://pi.paloo.fr/mapbs/static-ngeo/build/fr.json',
    /* Default language */
    default: 'de'
  },
  themes: {
    /* Link to the GeoMapFish-Compliant Themes.json */
    url: 'https://pi.paloo.fr/mapbs/themes?background=background&interface=desktop'
  },
  search: {
    /* Link to the GeoMapFish-Compliant Search Service
       The muster <###SEARCHTERM###> will be replaced by the search-term */
    url: 'https://pi.paloo.fr/mapbs/search?limit=90&partitionlimit=15&interface=desktop&query=###SEARCHTERM###'
  },
  print: {
    /* Link to the GeoMapFish-Compliant Print Service */
    url: 'https://pi.paloo.fr/mapbs/printproxy/',
    /* The print layout selecteed by default */
    defaultLayout: 'print_A4_hochformat'
  },
  map: {
    srid: 'EPSG:2056',
    startZoom: '16',
    startPosition: '2611377,1267643',
    maxExtent: '2600972,1262492,2623553,1272772'
  },
  map3d: {
    terrainUrl: 'https://pi.paloo.fr/3d/terrainproxy/028401be-a5fc-4560-a489-f64f458cd6ad_5/',
    tilesetUrl: 'https://pi.paloo.fr/3d/static/tiles/30c6266f-bbb7-4a20-8b50-7143dbab5648_19/tileset.json'
  }
}

export default GeoConfig;
