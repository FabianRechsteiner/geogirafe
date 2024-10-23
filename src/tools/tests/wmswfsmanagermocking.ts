import LayerWms from '../../models/layers/layerwms';
import ServerOgc from '../../models/serverogc';

export const mockOgcServers: Record<string, ServerOgc> = {
  'QGIS-1-has-wfs': new ServerOgc('QGIS-1-has-wfs', {
    url: 'https://qgis-wms-1.test.url',
    wfsSupport: true,
    urlWfs: 'https://wfs-1.url',
    type: 'qgisserver',
    imageType: 'image/png'
  }),
  'QGIS-2-has-wfs': new ServerOgc('QGIS-2-has-wfs', {
    url: 'https://qgis-wms-2.test.url',
    wfsSupport: true,
    urlWfs: 'https://qgis-wfs-2.url',
    type: 'qgisserver',
    imageType: 'image/png'
  }),
  'QGIS-3-no-wfs': new ServerOgc('QGIS-3-no-wfs', {
    url: 'https://qgis-wms-3.test.url',
    wfsSupport: false,
    type: 'qgisserver',
    imageType: 'image/png'
  }),
  'MapServer-1-has-wfs': new ServerOgc('MapServer-1-has-wfs', {
    url: 'https://ms-wms-1.test.url',
    wfsSupport: true,
    urlWfs: 'https://ms-wfs-1.url',
    type: 'mapserver',
    imageType: 'image/png'
  }),
  'MapServer-2-has-wfs': new ServerOgc('MapServer-2-has-wfs', {
    url: 'https://ms-wms-2.test.url',
    wfsSupport: true,
    urlWfs: 'https://ms-wfs-2.url',
    type: 'mapserver',
    imageType: 'image/png'
  }),
  'MapServer-3-no-wfs': new ServerOgc('MapServer-3-no-wfs', {
    url: 'https://ms-wms-3.test.url',
    wfsSupport: false,
    type: 'mapserver',
    imageType: 'image/png'
  })
};

export const mockWmsLayers: Record<string, LayerWms> = {
  'qgis1-layer1': new LayerWms(1, 'qgis1-layer1', 1, mockOgcServers['QGIS-1-has-wfs'], {
    queryable: true,
    queryLayers: 'qgis1-ql1,qgis1-ql2,qgis1-ql3'
  }), // multiple queryLayers
  'qgis1-layer2': new LayerWms(1, 'qgis1-layer2', 1, mockOgcServers['QGIS-1-has-wfs'], {
    queryable: true,
    queryLayers: 'qgis1-ql3,qgis1-ql4',
    opacity: 0.5
  }), // opacity: wmsClient independantLayer
  'qgis1-layer3': new LayerWms(1, 'qgis1-layer3', 1, mockOgcServers['QGIS-1-has-wfs'], {}), // layer without wfs on wfs-able server: should be ok
  'qgis2-layer1': new LayerWms(1, 'qgis2-layer1', 1, mockOgcServers['QGIS-2-has-wfs'], {
    queryable: true,
    queryLayers: 'qgis2-ql3'
  }), //single queryLayer
  'qgis3-layer1': new LayerWms(1, 'qgis3-layer1', 1, mockOgcServers['QGIS-3-no-wfs'], {}), // layer without wfs on server without wfs: no problemo
  'qgis3-layer2': new LayerWms(1, 'qgis3-layer2', 1, mockOgcServers['QGIS-3-no-wfs'], {
    queryable: true,
    queryLayers: 'qgis3-ql1nono'
  }) // queryable layer on server without wfs: problemo
};
