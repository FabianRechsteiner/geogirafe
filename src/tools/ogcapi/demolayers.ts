// POC demo variables
import ServerOgc from '../../models/serverogc';

export const DEMO_LAYERS: Record<string, any> = {
  GEORAMA: {
    url: 'https://demo.georama.io/features',
    name: 'Georama Rivers',
    collectionId: '60c4f0d6-2d57-4db1-bf7e-0f0f8f9c1e36',
    geometryType: 'MultiLineString',
    credentials: 'editor:6YPhizVs4BZPvm', // Credentials for demo env, not a risk
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
    credentials: undefined,
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
