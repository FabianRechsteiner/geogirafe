import { it, describe, expect, beforeEach, afterAll } from 'vitest';
import { EncodeLegendOptions, LegendURLDPI, MFPLegendClass, MFPLegendEncoder } from './MFPLegendEncoder';
import {
  createTestGroupLayer,
  createTestLayerWms,
  createTestLayerWmts,
  createTestOgcServer
} from '../../../tools/tests/layerhelpers';
import I18nManager from '../../../tools/i18n/i18nmanager';
import MapManager from '../../../tools/state/mapManager';
import StateManager from '../../../tools/state/statemanager';
import MockHelper from '../../../tools/tests/mockhelper';
import LayerWms from '../../../models/layers/layerwms';
import LayerWmts from '../../../models/layers/layerwmts';
import GroupLayer from '../../../models/layers/grouplayer';
import { createOlWmtsLayer } from '../../../tools/tests/olhelpers';

describe('MFPLegendEncoder', () => {
  let encoder = new MFPLegendEncoder();
  const encoderAsAny = encoder as any;
  let defaultOptions = {} as any as EncodeLegendOptions;

  const setPartialOptions = (options: Partial<EncodeLegendOptions>) => {
    encoder.setOptions({
      ...defaultOptions,
      ...options
    });
  };

  beforeEach(() => {
    MockHelper.startMocking();

    defaultOptions = {
      mapManager: MapManager.getInstance(),
      i18nManager: I18nManager.getInstance(),
      state: StateManager.getInstance().state,
      scale: 10000,
      printResolution: 254,
      dpi: 96,
      pageSize: [600, 400]
    } as any as EncodeLegendOptions;
    setPartialOptions({});
  });

  afterAll(() => {
    MockHelper.stopMocking();
  });

  describe('encodeLegend', () => {
    let layerWms: LayerWms;
    let layerWmts: LayerWmts;
    let layerGroup: GroupLayer;
    beforeEach(() => {
      layerWms = createTestLayerWms();
      layerWmts = createTestLayerWmts();
      layerGroup = createTestGroupLayer();
      layerGroup.children = [layerWms, layerWmts];
      StateManager.getInstance().state.layers.layersList = [layerGroup];
    });

    it('Encode layer, with not enough info the generate legends', () => {
      const result = encoder.encodeLegend(encoderAsAny.options);
      expect(result).toEqual(null);
    });

    it('Encode layer, with legends', () => {
      layerWms.legendImage = 'https://wmsLegend.png';
      layerWmts.legendImage = 'https://wmtsLegend.png';
      const result = encoder.encodeLegend(encoderAsAny.options);
      expect(result).toEqual({
        classes: [
          {
            classes: [
              {
                icons: ['https://wmsLegend.png'],
                name: 'testWms'
              },
              {
                icons: ['https://wmtsLegend.png'],
                name: 'testWmts'
              }
            ],
            name: 'testGroup'
          }
        ]
      });
    });

    it('Encode layer, with legends, no groups titles', () => {
      layerWms.legendImage = 'https://wmsLegend.png';
      layerWmts.legendImage = 'https://wmtsLegend.png';
      setPartialOptions({ showGroupsTitle: false });
      const result = encoder.encodeLegend(encoderAsAny.options);
      expect(result).toEqual({
        classes: [
          {
            classes: [
              {
                icons: ['https://wmsLegend.png'],
                name: 'testWms'
              },
              {
                icons: ['https://wmtsLegend.png'],
                name: 'testWmts'
              }
            ]
          }
        ]
      });
    });
  });

  describe('encodeLayerWmtsLegendClasses()', () => {
    let layer: LayerWmts;
    beforeEach(() => {
      layer = createTestLayerWmts();
    });

    it('should return null if the layer is out of resolution', () => {
      layer.minResolution = 1;
      layer.maxResolution = 100;
      setPartialOptions({ printResolution: 150 });
      const result = encoder.encodeLayerWmtsLegendClasses(layer);
      expect(result).toBeNull();
    });

    it('should return the encoded WMTS legend class with configured legend image', () => {
      layer._olayer = createOlWmtsLayer();
      layer.legendImage = 'https://legend.net';
      const result = encoder.encodeLayerWmtsLegendClasses(layer);
      expect(result).toEqual({
        name: 'testWmts',
        icons: ['https://legend.net']
      });
    });

    it('should return the encoded WMTS legend class', () => {
      layer._olayer = createOlWmtsLayer();
      layer._olayer.set('capabilitiesStyles', [{ LegendURL: [{ href: 'https://legend-from-cap.net' }] }]);
      const result = encoder.encodeLayerWmtsLegendClasses(layer);
      expect(result).toEqual({
        name: 'testWmts',
        icons: ['https://legend-from-cap.net']
      });
    });
  });

  describe('encodeLayerWmsLegendClasses', () => {
    let layer: LayerWms;
    beforeEach(() => {
      layer = createTestLayerWms();
    });

    it('should return null if the layer is not visible or inactive', () => {
      layer.opacity = 0;
      let result = encoder.encodeLayerWmsLegendClasses(layer);
      expect(result).toBeNull();

      layer.opacity = 1;
      layer.activeState = 'off';
      result = encoder.encodeLayerWmsLegendClasses(layer);
      expect(result).toBeNull();
    });

    it('should return MFPLegendClass with icon from legend image', () => {
      layer.legendImage = 'https://example.com/legend.png';
      const result = encoder.encodeLayerWmsLegendClasses(layer);
      expect(result?.name).toEqual('testWms');
      expect(result?.icons).toEqual([layer.legendImage]);
    });

    it('should return MFPLegendClass with one classe', () => {
      layer.layers = 'foo';
      const result = encoder.encodeLayerWmsLegendClasses(layer);
      expect(result?.name).toEqual('testWms');
      // One layer = no subclass, complete directly the current class.
      expect(result?.icons).toEqual([
        'https://ogc.test.url?FORMAT=image%2Fpng&TRANSPARENT=TRUE&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=foo&SCALE=10000'
      ]);
    });

    it('should return MFPLegendClass with two classes and query-params', () => {
      layer.layers = 'foo,bar';
      const result = encoder.encodeLayerWmsLegendClasses(layer);
      expect(result?.name).toEqual('testWms');
      // Two layer = new subclass.
      expect(result?.classes?.length).toBe(2);
      const classes = result?.classes ?? [];
      expect(classes[0]).toEqual({
        name: 'foo',
        icons: [
          'https://ogc.test.url?FORMAT=image%2Fpng&TRANSPARENT=TRUE&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=foo&SCALE=10000'
        ]
      });
      expect(classes[1]).toEqual({
        name: 'bar',
        icons: [
          'https://ogc.test.url?FORMAT=image%2Fpng&TRANSPARENT=TRUE&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=bar&SCALE=10000'
        ]
      });
    });

    it('should return MFPLegendClass with one class, params, and no title', () => {
      layer.layers = 'foo,bar';
      const ogcServer = createTestOgcServer();
      StateManager.getInstance().state.ogcServers = { [ogcServer.name]: ogcServer };
      setPartialOptions({
        showGroupsTitle: false,
        params: { [ogcServer.type]: { filtered: 'houses' } }
      });
      const result = encoder.encodeLayerWmsLegendClasses(layer);
      // No title
      expect(result?.name).toBeUndefined();
      // Two layer = new subclass.
      expect(result?.classes?.length).toBe(2);
      const classes = result?.classes ?? [];
      // With final params
      expect(classes[0]).toEqual({
        name: 'foo',
        icons: [
          'https://ogc.test.url?FORMAT=image%2Fpng&TRANSPARENT=TRUE&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=foo&SCALE=10000&filtered=houses'
        ]
      });
      expect(classes[1]).toEqual({
        name: 'bar',
        icons: [
          'https://ogc.test.url?FORMAT=image%2Fpng&TRANSPARENT=TRUE&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=bar&SCALE=10000&filtered=houses'
        ]
      });
    });
  });

  it('getLegendClassForWMS', () => {
    const layerName = 'LayerName';
    const icon_dpi: LegendURLDPI = {
      url: 'legend.png',
      dpi: 96
    };
    const serverType = 'serverType1';
    let result = encoder.getLegendClassForWMS(layerName, icon_dpi, serverType);
    expect(result.name).toEqual('LayerName');
    expect(result.icons).toEqual([icon_dpi.url]);
    expect(result.dpi).toBeUndefined();

    icon_dpi.dpi = 300;
    result = encoder.getLegendClassForWMS(layerName, icon_dpi, serverType);
    expect(result.dpi).toEqual(icon_dpi.dpi);
  });

  it('getMetadataLegendImage', () => {
    const wms = createTestLayerWms({
      legendImage: 'testUrl',
      hiDPILegendImages: { '300': 'testHiDpiUrl' }
    });

    setPartialOptions({ dpi: undefined });
    let result = encoder.getMetadataLegendImage(wms);
    expect(result).toEqual({ url: 'testUrl', dpi: 96 });

    setPartialOptions({ dpi: 300 });
    result = encoder.getMetadataLegendImage(wms);
    expect(result).toEqual({ url: 'testHiDpiUrl', dpi: 300 });

    wms.legendImage = undefined;
    wms.hiDPILegendImages = undefined;
    setPartialOptions({ dpi: undefined });
    result = encoder.getMetadataLegendImage(wms);
    expect(result).toBeNull();
  });

  it('mustHideLabel', () => {
    const serverType = 'fake-server';
    expect(encoderAsAny.mustHideLabel(serverType)).toBeFalsy();

    setPartialOptions({ label: { [serverType]: false } });
    expect(encoderAsAny.mustHideLabel(serverType)).toBeTruthy();

    setPartialOptions({ label: { [serverType]: true } });
    expect(encoderAsAny.mustHideLabel(serverType)).toBeFalsy();
  });

  it('addClassItemToArray', () => {
    const classes: MFPLegendClass[] = [];
    const classItem: MFPLegendClass = { name: 'test', icons: ['url1', 'url2'] };

    encoderAsAny.addClassItemToArray(classes, classItem);
    expect(classes.length).toBe(1);
    expect(classes[0]).toEqual(classItem);

    const nestedClassItem: MFPLegendClass = { name: 'nested', classes: [classItem] };
    encoderAsAny.addClassItemToArray(classes, nestedClassItem);
    expect(classes.length).toBe(2);
    expect(classes[1]).toEqual(nestedClassItem);

    const emptyNestedClassItem: MFPLegendClass = { name: 'empty', classes: [] };
    encoderAsAny.addClassItemToArray(classes, emptyNestedClassItem);
    expect(classes.length).toBe(2);
  });

  it('tryToSimplifyLegendGroup', () => {
    // No child, don't merge.
    expect(encoderAsAny.tryToSimplifyLegendGroup({ name: 'LegendGroup', icons: ['icon_1.png'] })).toEqual({
      name: 'LegendGroup',
      icons: ['icon_1.png']
    });

    // One child, same name, merge.
    expect(
      encoderAsAny.tryToSimplifyLegendGroup({
        name: 'LegendGroup',
        classes: [{ name: 'LegendGroup', icons: ['icon_1.png'] }]
      })
    ).toEqual({ name: 'LegendGroup', icons: ['icon_1.png'] });

    // Two children, don't merge
    expect(
      encoderAsAny.tryToSimplifyLegendGroup({
        name: 'LegendGroup1',
        classes: [
          { name: 'LegendGroup1', icons: ['icon_1.png'] },
          { name: 'LegendGroup2', icons: ['icon_2.png'] }
        ]
      })
    ).toEqual({
      name: 'LegendGroup1',
      classes: [
        { name: 'LegendGroup1', icons: ['icon_1.png'] },
        { name: 'LegendGroup2', icons: ['icon_2.png'] }
      ]
    });
  });
});
