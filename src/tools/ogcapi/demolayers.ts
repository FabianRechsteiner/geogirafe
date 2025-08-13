// POC demo variables
import ServerOgc from '../../models/serverogc';

export const DEMO_LAYERS: Record<string, any> = {
  GEORAMA: {
    url: 'https://demo.georama.io/features',
    name: 'Georama Rivers',
    collectionId: 'cb14a0d9-016b-454a-84a5-475340f0a433',
    geometryType: 'MultiLineString',
    serverType: 'georama',
    server: new ServerOgc('GEORAMA', {
      url: 'https://demo.georama.io/features',
      wfsSupport: false,
      urlWfs: '',
      oapifSupport: true,
      urlOapif: 'https://demo.georama.io/features',
      type: 'georama',
      imageType: ''
    })
  },
  GMF: {
    url: 'https://geomapfish-demo-2-9.camptocamp.com/mapserv_proxy/QGIS_Server/wfs3',
    name: 'GeoMapFish Points',
    collectionId: 'points',
    geometryType: 'Point',
    serverType: 'gmf',
    server: new ServerOgc('gmf', {
      url: 'https://geomapfish-demo-2-9.camptocamp.com/mapserv_proxy/QGIS_Server/wfs3',
      wfsSupport: false,
      urlWfs: '',
      oapifSupport: true,
      urlOapif: 'https://geomapfish-demo-2-9.camptocamp.com/mapserv_proxy/QGIS_Server/wfs3',
      type: 'gmf',
      imageType: ''
    })
  }
};
