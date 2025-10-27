import { expect, describe, it, beforeEach, afterAll } from 'vitest';
import MFPEncoder, { EncodeMapOptions } from './MFPEncoder';
import MockHelper from '../../../tools/tests/mockhelper';
import GroupLayer from '../../../models/layers/grouplayer';
import BaseLayer from '../../../models/layers/baselayer';
import Basemap from '../../../models/basemaps/basemap';
import {
  createTestLayerWmts,
  createTestLayerWms,
  createTestGroupLayer,
  createTestOgcServer
} from '../../../tools/tests/layerhelpers';
import { createOlVectorLayer, createOlWmtsLayer } from '../../../tools/tests/olhelpers';
import { BaseCustomizer, MFPWmtsLayer } from '@geoblocks/mapfishprint';
import IGirafeContext from '../../../tools/context/icontext';

describe('MFPEncoder', () => {
  let encoder = new MFPEncoder();
  let encoderAsAny = encoder as any;
  let defaultOptions = {} as any as EncodeMapOptions;
  let context: IGirafeContext;

  const setPartialOptions = (options: Partial<EncodeMapOptions>) => {
    encoder.setOptions({
      ...defaultOptions,
      ...options
    });
  };

  beforeEach(() => {
    context = MockHelper.startMocking();

    defaultOptions = {
      state: context.stateManager.state,
      mapManager: context.mapManager,
      scale: 10000,
      printResolution: 254,
      dpi: 96,
      customizer: new BaseCustomizer()
    } as any as EncodeMapOptions;
    setPartialOptions({});
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  describe('encodeLayer', () => {
    let topLevelGroup: BaseLayer[];
    let groupLayers: GroupLayer[];
    let layers: BaseLayer[];
    beforeEach(() => {
      layers = [...Array(3)].map((_, index) => {
        const layer = createTestLayerWms();
        layer.layers = `wms-${index}`;
        return layer;
      });

      const wmtsLayer = createTestLayerWmts();
      wmtsLayer._olayer = createOlWmtsLayer();
      layers.push(wmtsLayer);

      groupLayers = [...Array(4)].map((_) => {
        return createTestGroupLayer();
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
      context.stateManager.state.layers.layersList = topLevelGroup;

      const baseMap = createTestLayerWmts();
      baseMap._olayer = createOlWmtsLayer();
      baseMap.name = 'basemap-below';
      const activeBasemap = (context.stateManager.state.activeBasemap = new Basemap({
        id: 1,
        name: 'test'
      }));
      activeBasemap.layersList = [baseMap];

      const vectorLayer = createOlVectorLayer();
      vectorLayer.set('addToPrintedLayers', true);
      context.mapManager.getMap().addLayer(vectorLayer);

      context.mapManager.getMap().getView().setRotation(Math.PI);

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
    it('should return null for not visible layer', () => {
      const layer = createTestLayerWms({ opacity: 0 });
      const result = encoder.encodeImageLayer(layer);
      expect(result).toEqual(null);
    });

    it('should encode a wms layer', () => {
      const layer = createTestLayerWms({ layers: 'tree,plant', opacity: 0.6 });
      const result = encoder.encodeImageLayer(layer);
      expect(result).toEqual({
        baseURL: 'https://ogc.test.url/',
        customParams: {
          TRANSPARENT: 'TRUE'
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
    it('Testing encodeTileWmtsLayer method with inactive layer', () => {
      const layer = createTestLayerWmts({ opacity: 0 });
      const result = encoder.encodeTileWmtsLayer(layer);
      expect(result).toBe(null);
    });

    it('Testing encodeTileWmtsLayer method', () => {
      const layer = createTestLayerWmts();
      layer._olayer = createOlWmtsLayer();
      const result = encoder.encodeTileWmtsLayer(layer) as MFPWmtsLayer;
      const urls = layer._olayer.getSource()?.getUrls() ?? [];
      expect(result?.baseURL).toEqual(urls[0]);
      expect(result?.imageFormat).toBe(layer._olayer.getSource()?.getFormat());
      expect(result?.layer).toBe(layer._olayer.getSource()?.getLayer());
      expect(result?.opacity).toBe(layer.opacity);
      expect(result?.name).toBe(layer.name);
      expect(result?.type).toBe('wmts');
    });

    it('Testing encodeTileWmtsLayer method with a WMTS Layer which has a configured WMS layer for the print. ', () => {
      const layer = createTestLayerWmts();
      layer._olayer = createOlWmtsLayer();
      layer.wmsLayers = 'wms-print-layer';
      const ogcServer = createTestOgcServer();
      context.stateManager.state.ogcServers = { [ogcServer.name]: ogcServer };
      layer.ogcServer = ogcServer;
      const result = encoder.encodeTileWmtsLayer(layer) as MFPWmtsLayer;
      // More test in the dedicated tests suits below.
      expect(result?.type).toBe('wms');
    });
  });

  describe('encodeWmsFromWmtsLayer', () => {
    it('should return null if the ogcServer is missing', () => {
      const layer = createTestLayerWmts();
      const result = encoder.encodeWmsFromWmtsLayer(layer);
      expect(result).toBeNull();
    });

    it('should correctly encode a WMS layer from a WMTS layer', async () => {
      const ogcServer = createTestOgcServer();
      context.stateManager.state.ogcServers = { [ogcServer.name]: ogcServer };
      const layer = createTestLayerWmts({ printLayers: 'printed-wms-replacing-wmts', opacity: 0.6 }, ogcServer);
      const result = encoder.encodeWmsFromWmtsLayer(layer);
      expect(result).toEqual({
        baseURL: 'https://ogc.test.url/',
        customParams: {
          TRANSPARENT: 'TRUE'
        },
        imageFormat: 'image/png',
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
