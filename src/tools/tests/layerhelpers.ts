import LayerWms, { LayerWmsOptions } from '../../models/layers/layerwms';
import LayerWmts, { LayerWmtsOptions } from '../../models/layers/layerwmts';
import GroupLayer, { GroupLayerOptions } from '../../models/layers/grouplayer';
import ServerOgc from '../../models/serverogc';

export const createTestOgcServer = (): ServerOgc => {
  return new ServerOgc('testOgcServer', {
    url: 'https://ogc.test.url',
    wfsSupport: false,
    type: 'mapserver',
    imageType: 'image/png'
  });
};

export const createTestLayerWms = (options?: LayerWmsOptions): LayerWms => {
  const ogcServer = createTestOgcServer();
  const layerWms = new LayerWms(1, 'testWms', 1, ogcServer, options);
  layerWms.activeState = 'on';
  return layerWms;
};

export const createTestLayerWmts = (options?: LayerWmtsOptions, ogcServer?: ServerOgc): LayerWmts => {
  const layerWmts = new LayerWmts(1, 'testWmts', 1, 'https://test.ch', 'testWmts', options, ogcServer);
  layerWmts.activeState = 'on';
  return layerWmts;
};

export const createTestGroupLayer = (options?: GroupLayerOptions): GroupLayer => {
  return new GroupLayer(1, 'testGroup', 1, options);
};
