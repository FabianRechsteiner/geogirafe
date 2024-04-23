import { expect, describe, it, beforeEach, afterAll } from 'vitest';
import MFPEncoder, { EncodeMapOptions } from './MFPEncoder';
import MockHelper from '../../../tools/tests/mockhelper';
import MapManager from '../../../tools/state/mapManager';
import StateManager from '../../../tools/state/statemanager';
import LayerWmts from '../../../models/layers/layerwmts';
import LayerWms from '../../../models/layers/layerwms';
import GroupLayer from '../../../models/layers/grouplayer';
import BaseLayer from '../../../models/layers/baselayer';
import Basemap from '../../../models/basemap';
import { createTestLayerWmts, createTestLayerWms, createTestGroupLayer } from '../../../tools/tests/layerhelpers';
import { createVectorLayers, createWMTSLayers } from '../../../tools/tests/olhelpers';
import { BaseCustomizer, MFPWmtsLayer } from '@geoblocks/mapfishprint';

describe('MFPEncoder', () => {
  let encoder = new MFPEncoder();
  let encoderAsAny = encoder as any;
  let defaultOptions = {} as any as EncodeMapOptions;

  const setPartialOptions = (options: Partial<EncodeMapOptions>) => {
    encoder.setOptions({
      ...defaultOptions,
      ...options
    });
  };

  beforeEach(() => {
    MockHelper.startMocking();

    defaultOptions = {
      state: StateManager.getInstance().state,
      mapManager: MapManager.getInstance(),
      scale: 10000,
      printResolution: 254,
      dpi: 96,
      customizer: new BaseCustomizer()
    } as any as EncodeMapOptions;
    setPartialOptions({});
  });

  afterAll(() => {
    MockHelper.stopMocking();
  });

  describe('encodeLayer', () => {
    let topLevelGroup: BaseLayer[];
    let groupLayers: GroupLayer[];
    let layers: BaseLayer[];
    beforeEach(() => {
      layers = [...Array(3)].map((_, index) => {
        const layer = createTestLayerWms({});
        layer.url = 'https://test-wms.ch';
        layer.layers = `wms-${index}`;
        return layer;
      });

      const wmtsLayer = createTestLayerWmts({});
      wmtsLayer._olayer = createWMTSLayers();
      layers.push(wmtsLayer);

      groupLayers = [...Array(4)].map((_) => {
        return createTestGroupLayer({});
      });
      groupLayers[0].children = [layers[0], layers[1]];
      groupLayers[1].children = [layers[2]];
      groupLayers[2].children = [layers[3], groupLayers[0]];
      groupLayers[3].children = [groupLayers[1], groupLayers[2]];
      topLevelGroup = [groupLayers[3]];
    });

    it('getFlatLayersGroupLayers', () => {
      const result = encoder.getFlatLayers(topLevelGroup);
      expect(result.length).toBe(4); // 4 wms layers
    });

    it('encode the map', () => {
      StateManager.getInstance().state.layers.layersList = topLevelGroup;

      const baseMap = createTestLayerWmts({});
      baseMap._olayer = createWMTSLayers();
      baseMap.name = 'basemap-below';
      const activeBasemap = (StateManager.getInstance().state.activeBasemap = new Basemap({ id: 1, name: 'test' }));
      activeBasemap.layersList = [baseMap];

      const vectorLayer = createVectorLayers();
      vectorLayer.set('addToPrintedLayers', true);
      MapManager.getInstance().getMap().addLayer(vectorLayer);

      MapManager.getInstance().getMap().getView().setRotation(Math.PI);

      const result = encoder.encodeMap(encoderAsAny.options);
      expect(result.dpi).toBe(defaultOptions.dpi);
      expect(result.scale).toBe(defaultOptions.scale);
      expect(result.rotation).toBe(180);
      expect(result.layers.length).toBe(6);
      // Test order
      expect(result.layers[0].name).toBe('Test Vector layer');
      expect(result.layers[5].name).toBe('basemap-below');
    });
  });

  describe('encodeImageLayer method', () => {
    let layer: LayerWms;
    beforeEach(() => {
      layer = createTestLayerWms({});
    });

    it('should return null for not visible layer', () => {
      layer.opacity = 0;
      const result = encoder.encodeImageLayer(layer);
      expect(result).toEqual(null);
    });

    it('should encode a wms layer', () => {
      layer.layers = 'tree,plant';
      layer.url = 'https://wms-layer.net';
      layer.opacity = 0.6;
      const result = encoder.encodeImageLayer(layer);
      expect(result).toEqual({
        baseURL: 'https://wms-layer.net/',
        customParams: {
          TRANSPARENT: 'true'
        },
        imageFormat: 'image/png',
        layers: ['tree', 'plant'],
        opacity: 0.6,
        serverType: undefined,
        styles: ['', ''],
        type: 'wms',
        useNativeAngle: undefined
      });
    });
  });

  describe('encodeTileWmtsLayer', () => {
    let layer: LayerWmts;
    beforeEach(() => {
      layer = createTestLayerWmts({});
    });

    it('Testing encodeTileWmtsLayer method with inactive layer', () => {
      layer.opacity = 0;
      const result = encoder.encodeTileWmtsLayer(layer);
      expect(result).toBe(null);
    });

    it('Testing encodeTileWmtsLayer method', () => {
      layer._olayer = createWMTSLayers();
      const result = encoder.encodeTileWmtsLayer(layer) as MFPWmtsLayer;
      const urls = layer._olayer.getSource()?.getUrls() ?? [];
      expect(result?.baseURL).toEqual(urls[0]);
      expect(result?.imageFormat).toBe(layer._olayer.getSource()?.getFormat());
      expect(result?.layer).toBe(layer._olayer.getSource()?.getLayer());
      expect(result?.opacity).toBe(layer.opacity);
      expect(result?.name).toBe(layer.name);
      expect(result?.type).toBe('wmts');
    });

    it('Testing encodeTileWmtsLayer method with wms layer', () => {
      layer._olayer = createWMTSLayers();
      layer.wmsLayers = 'wms-print-layer';
      const ogcServerName = 'test server';
      const ogcServer = MockHelper.getServerOgc();
      StateManager.getInstance().state.ogcServers = { [ogcServerName]: ogcServer };
      layer.ogcServer = ogcServerName;
      const result = encoder.encodeTileWmtsLayer(layer) as MFPWmtsLayer;
      // More test in the dedicated tests suits below.
      expect(result?.type).toBe('wms');
    });
  });

  describe('encodeWmsFromWmtsLayer', () => {
    let layer: LayerWmts;
    beforeEach(() => {
      layer = createTestLayerWmts({});
    });

    it('should return null if the ogcServer is missing', () => {
      const result = encoder.encodeWmsFromWmtsLayer(layer);
      expect(result).toBeNull();
    });

    it('should correctly encode a WMS layer from a WMTS layer', async () => {
      const ogcServerName = 'test server';
      const ogcServer = MockHelper.getServerOgc();
      StateManager.getInstance().state.ogcServers = { [ogcServerName]: ogcServer };
      layer.ogcServer = ogcServerName;
      layer.printLayers = 'printed-wms-replacing-wmts';
      layer.opacity = 0.6;
      const result = encoder.encodeWmsFromWmtsLayer(layer);
      expect(result).toEqual({
        baseURL: 'https://test.com/',
        customParams: {
          TRANSPARENT: 'true'
        },
        imageFormat: 'image/jpg',
        layers: ['printed-wms-replacing-wmts'],
        opacity: 0.6,
        serverType: 'mapserver',
        styles: [''],
        type: 'wms',
        useNativeAngle: undefined
      });
    });
  });
});
