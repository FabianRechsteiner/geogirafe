/*
  This is the whole configuration of the GeoGirafe Viewer. 
  Here, you can set the entries according to your environment.
*/
const GeoConfig = {
  languages: {
    /* List of languages with their corresponding translation-file. */
    fr: 'https://map.cartoriviera.ch/static/dummy/fr.json',
    /* Default language */
    default: 'fr'
  },
  themes: {
    /* Link to the GeoMapFish-Compliant Themes.json */
    url: 'https://pi.paloo.fr/cartoriviera/themes?background=background&interface=desktop'
  },
  search: {
    /* Link to the GeoMapFish-Compliant Search Service
       The muster <###SEARCHTERM###> will be replaced by the search-term */
    url: 'https://pi.paloo.fr/cartoriviera/search?limit=90&partitionlimit=15&interface=desktop&query=###SEARCHTERM###'
  },
  print: {
    /* Link to the GeoMapFish-Compliant Print Service */
    url: 'https://pi.paloo.fr/cartoriviera/printproxy/',
    /* The print layout selected by default */
    defaultLayout: '1) A4 paysage'
  },
  map: {
    srid: 'EPSG:2056',
    startZoom: '8',
    startPosition: '2556000,1145000',
    maxExtent: '2550000,1133383,2570000,1153233'
  },
  map3d: {
    terrainUrl: 'https://terrain100.geo.admin.ch/1.0.0/ch.swisstopo.terrain.3d/',
    tilesetUrl: 'https://vectortiles100.geo.admin.ch/3d-tiles/ch.swisstopo.swisstlm3d.3d/20201020/tileset.json'
  }
}

export default GeoConfig;
