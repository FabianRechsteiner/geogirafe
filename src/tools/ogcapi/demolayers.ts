// SPDX-License-Identifier: Apache-2.0
// POC demo variables
import ServerOgc from '../../models/serverogc';

export const DEMO_LAYERS: Record<string, any> = {
  GEORAMA: {
    url: 'https://demo.georama.io/features/api',
    displayName: 'Georama Rivers',
    // To allow for changing collectionIds (uuids) while developing georama,
    // we use an interim solution and identify the collection by title.
    collectionId: null,
    collectionTitle: 'Flüsse',
    geometryType: 'MultiLineString',
    serverType: 'georama',
    server: new ServerOgc('GEORAMA', {
      url: 'https://demo.georama.io/features/api',
      wfsSupport: false,
      urlWfs: '',
      oapifSupport: true,
      urlOapif: 'https://demo.georama.io/features/api',
      type: 'georama',
      imageType: ''
    })
  },
  GMF: {
    url: 'https://geomapfish-demo-2-9.camptocamp.com/mapserv_proxy/QGIS_Server/wfs3',
    displayName: 'GeoMapFish Points',
    collectionId: 'points',
    collectionTitle: null,
    geometryType: 'Point',
    serverType: 'gmf',
    server: new ServerOgc('gmf', {
      url: 'https://geomapfish-demo-2-9.camptocamp.com/mapserv_proxy/QGIS_Server/wfs3',
      wfsSupport: false,
      urlWfs: '',
      oapifSupport: true,
      urlOapif: 'https://geomapfish-demo-2-9.camptocamp.com/mapserv_proxy/QGIS_Server/wfs3',
      // @ts-expect-error Defining a new type of server here to be able to catch some miss-configuration
      //  of the GMF demo server, see ogcapifeaturesclientgmf.ts
      type: 'gmf',
      imageType: ''
    })
  }
};
