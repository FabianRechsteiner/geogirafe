import { it, expect, describe, vi, beforeEach, afterEach } from 'vitest';

import Map from 'ol/Map';

import { mockOgcServers, mockWmsLayers } from '../tests/wmswfsmanagermocking';
import MockHelper from '../tests/mockhelper';
import IGirafeContext from '../context/icontext';
import WmsClient from './wmsclient';
import LayerWms from '../../models/layers/layerwms';
import ServerOgc from '../../models/serverogc';
import SelectionParam from '../../models/selectionparam';

const fetchMock = vi.fn();
global.fetch = fetchMock;
let context: IGirafeContext;

let wmsClientQg1L1: WmsClient;
let wmsClientQg2L1: WmsClient;
let layerQg1L1: LayerWms;
let layerQg1L2: LayerWms;
let layerQg1L3: LayerWms;
let layerQg2L1: LayerWms;
let ogcServerQg1: ServerOgc;
let ogcServerQg2: ServerOgc;

// MapServer layers
/*
  const wmsClientMsL1 = wmsManager.getClient(mockWmsLayers[x])
  const wmsClientMsL2 = wmsManager.getClient(mockWmsLayers[x])
  const wmsClientMsL3 = wmsManager.getClient(mockWmsLayers[x])
  */

describe('WmsClient.addLayer()', () => {
  beforeEach(() => {
    context = MockHelper.startMocking();
    context.stateManager.state.position.resolution = 100;
    const wmsManager = context.wmsManager;
    // @ts-ignore
    wmsManager.map = new Map({ layers: [] });

    // QGIS OgcServers
    ogcServerQg1 = mockOgcServers['QGIS-1-has-wfs'];
    ogcServerQg2 = mockOgcServers['QGIS-2-has-wfs'];

    // QGIS layerWms
    layerQg1L1 = mockWmsLayers['qgis1-layer1'];
    layerQg1L2 = mockWmsLayers['qgis1-layer2'];
    layerQg1L3 = mockWmsLayers['qgis1-layer3'];
    layerQg2L1 = mockWmsLayers['qgis2-layer1'];

    // QGIS clients
    // from layers
    wmsClientQg1L1 = wmsManager.getClient(layerQg1L1);
    wmsClientQg2L1 = wmsManager.getClient(layerQg2L1);
  });

  afterEach(() => {
    MockHelper.stopMocking(context);
  });

  it('Layers QG1L1 and QG1L3 should have been added to client as standard Layers (no opacity/filter/swiped)', () => {
    wmsClientQg1L1.addLayer(layerQg1L1);
    wmsClientQg1L1.addLayer(layerQg1L2);
    wmsClientQg1L1.addLayer(layerQg1L3);
    wmsClientQg2L1.addLayer(layerQg2L1);

    expect(wmsClientQg1L1.layerInStandardLayers(layerQg1L1)).toEqual(true);
    expect(wmsClientQg1L1.layerInStandardLayers(layerQg1L3)).toEqual(true);
    expect(wmsClientQg1L1.layerIsIndependantLayer(layerQg1L1)).toEqual(false);
    expect(wmsClientQg1L1.layerIsIndependantLayer(layerQg1L3)).toEqual(false);
  });

  it('Layer QG1L2 has opacity and should be an independantLayer, not a standard Layer', () => {
    wmsClientQg1L1.addLayer(layerQg1L1);
    wmsClientQg1L1.addLayer(layerQg1L2);
    wmsClientQg1L1.addLayer(layerQg1L3);
    wmsClientQg2L1.addLayer(layerQg2L1);

    expect(wmsClientQg1L1.layerIsIndependantLayer(layerQg1L2)).toEqual(true);
    expect(wmsClientQg1L1.layerInStandardLayers(layerQg1L2)).toEqual(false);
  });
});

describe('WmsClient.selectFeatures()', () => {
  beforeEach(() => {
    context = MockHelper.startMocking();
    context.stateManager.state.position.resolution = 100;
    const wmsManager = context.wmsManager;
    // @ts-ignore
    wmsManager.map = new Map({ layers: [] });

    // QGIS OgcServers
    ogcServerQg1 = mockOgcServers['QGIS-1-has-wfs'];
    ogcServerQg2 = mockOgcServers['QGIS-2-has-wfs'];

    // QGIS layerWms
    layerQg1L1 = mockWmsLayers['qgis1-layer1'];
    layerQg1L2 = mockWmsLayers['qgis1-layer2'];
    layerQg1L3 = mockWmsLayers['qgis1-layer3'];
    layerQg2L1 = mockWmsLayers['qgis2-layer1'];

    // QGIS clients
    // from layers
    wmsClientQg1L1 = wmsManager.getClient(layerQg1L1);
    wmsClientQg2L1 = wmsManager.getClient(layerQg2L1);
  });

  afterEach(() => {
    MockHelper.stopMocking(context);
  });

  it('should have added 3 SelectionParams: wmsClientQg1 standardLayers, 1 wmsClientQg1 independantLayers, wmsClientQg2 standardLayers', () => {
    wmsClientQg1L1.addLayer(layerQg1L1);
    wmsClientQg1L1.addLayer(layerQg1L2);
    wmsClientQg1L1.addLayer(layerQg1L3);
    wmsClientQg2L1.addLayer(layerQg2L1);

    wmsClientQg1L1.selectFeatures([0, 1, 2, 3]);
    // add selection param wmsClientQg2 standardLayers
    wmsClientQg2L1.selectFeatures([0, 1, 2, 3]);

    expect(wmsClientQg1L1.state.selection.selectionParameters.length).toEqual(3);

    expect(wmsClientQg1L1.state.selection.selectionParameters[0]._layers.map((l) => l.name)).toEqual([
      'qgis1-layer1',
      'qgis1-layer3'
    ]);
    expect(wmsClientQg1L1.state.selection.selectionParameters[0]._ogcServer).toEqual(ogcServerQg1);

    expect(wmsClientQg1L1.state.selection.selectionParameters[1]._layers.map((l) => l.name)).toEqual(['qgis1-layer2']);
    expect(wmsClientQg1L1.state.selection.selectionParameters[1]._ogcServer).toEqual(ogcServerQg1);

    expect(wmsClientQg1L1.state.selection.selectionParameters[2]._layers.map((l) => l.name)).toEqual(['qgis2-layer1']);
    expect(wmsClientQg1L1.state.selection.selectionParameters[2]._ogcServer).toEqual(ogcServerQg2);
  });
});

describe('WmsClient.GetFeatureInfo()', () => {
  let selectionParam1Qg1: SelectionParam;
  let selectionParam2Qg1: SelectionParam;
  let selectionParam1Qg2: SelectionParam;
  let getFeatureInfoUrlQg1: any;
  let getFeatureInfoUrlQg2: any;

  beforeEach(() => {
    context = MockHelper.startMocking();
    context.stateManager.state.position.resolution = 100;
    const wmsManager = context.wmsManager;
    // @ts-ignore
    wmsManager.map = new Map({ layers: [] });

    // QGIS OgcServers
    ogcServerQg1 = mockOgcServers['QGIS-1-has-wfs'];
    ogcServerQg2 = mockOgcServers['QGIS-2-has-wfs'];

    // QGIS layerWms
    layerQg1L1 = mockWmsLayers['qgis1-layer1'];
    layerQg1L2 = mockWmsLayers['qgis1-layer2'];
    layerQg1L3 = mockWmsLayers['qgis1-layer3'];
    layerQg2L1 = mockWmsLayers['qgis2-layer1'];

    // QGIS clients
    // from layers
    wmsClientQg1L1 = wmsManager.getClient(layerQg1L1);
    wmsClientQg2L1 = wmsManager.getClient(layerQg2L1);

    wmsClientQg1L1.addLayer(layerQg1L1);
    wmsClientQg1L1.addLayer(layerQg1L2);
    wmsClientQg1L1.addLayer(layerQg1L3);
    wmsClientQg2L1.addLayer(layerQg2L1);

    wmsClientQg1L1.selectFeatures([0, 1, 2, 3]);
    wmsClientQg2L1.selectFeatures([0, 1, 2, 3]);

    const selectionParams = wmsClientQg1L1.state.selection.selectionParameters;
    selectionParam1Qg1 = selectionParams[0];
    selectionParam2Qg1 = selectionParams[1];
    selectionParam1Qg2 = selectionParams[2];

    // @ts-ignore
    getFeatureInfoUrlQg1 = vi.spyOn(wmsClientQg1L1, 'getFeatureInfoUrl');
    // @ts-ignore
    getFeatureInfoUrlQg2 = vi.spyOn(wmsClientQg2L1, 'getFeatureInfoUrl');
    fetchMock.mockResolvedValue({ text: () => '' });
  });

  afterEach(() => {
    MockHelper.stopMocking(context);
  });

  it('should have fetched the url corresponding to SelectionPara QGIS server 1 standard layers', () => {
    wmsClientQg1L1.getFeatureInfo(selectionParam1Qg1);
    const url =
      'https://qgis-wms-1.test.url?QUERY_LAYERS=qgis1-layer1%2Cqgis1-layer3&INFO_FORMAT=application%2Fvnd.ogc.gml&REQUEST=GetFeatureInfo&SERVICE=WMS&VERSION=1.3.0&FORMAT=image%2Fpng&STYLES=&TRANSPARENT=TRUE&LAYERS=qgis1-layer1%2Cqgis1-layer3&FEATURE_COUNT=300&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG%3A2056&BBOX=-5301.5%2C-5300.5%2C5303.5%2C5304.5';
    const getFeatureInfoUrlReturn: Record<string, string> = {};
    getFeatureInfoUrlReturn[url] = 'qgis1-layer1';
    expect(getFeatureInfoUrlQg1).toHaveReturnedWith(getFeatureInfoUrlReturn);
    expect(fetchMock).toHaveBeenCalledWith(url);
  });

  it('should have fetched the url corresponding to SelectionPara QGIS server 1 independant layer "qgis1-layer2"', () => {
    wmsClientQg1L1.getFeatureInfo(selectionParam2Qg1);
    const url =
      'https://qgis-wms-1.test.url?QUERY_LAYERS=qgis1-layer2&INFO_FORMAT=application%2Fvnd.ogc.gml&REQUEST=GetFeatureInfo&SERVICE=WMS&VERSION=1.3.0&FORMAT=image%2Fpng&STYLES=&TRANSPARENT=TRUE&LAYERS=qgis1-layer2&FEATURE_COUNT=300&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG%3A2056&BBOX=-5301.5%2C-5300.5%2C5303.5%2C5304.5';
    const getFeatureInfoUrlReturn: Record<string, string> = {};
    getFeatureInfoUrlReturn[url] = 'qgis1-layer2';
    expect(getFeatureInfoUrlQg1).toHaveReturnedWith(getFeatureInfoUrlReturn);
    expect(fetchMock).toHaveBeenCalledWith(url);
  });

  it('should have fetched the url corresponding to SelectionPara QGIS server 2 standard layers', () => {
    wmsClientQg2L1.getFeatureInfo(selectionParam1Qg2);
    const url =
      'https://qgis-wms-2.test.url?QUERY_LAYERS=qgis2-layer1&INFO_FORMAT=application%2Fvnd.ogc.gml&REQUEST=GetFeatureInfo&SERVICE=WMS&VERSION=1.3.0&FORMAT=image%2Fpng&STYLES=&TRANSPARENT=TRUE&LAYERS=qgis2-layer1&FEATURE_COUNT=300&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG%3A2056&BBOX=-5301.5%2C-5300.5%2C5303.5%2C5304.5';
    const getFeatureInfoUrlReturn: Record<string, string> = {};
    getFeatureInfoUrlReturn[url] = 'qgis2-layer1';
    expect(getFeatureInfoUrlQg2).toHaveReturnedWith(getFeatureInfoUrlReturn);
    expect(fetchMock).toHaveBeenCalledWith(url);
  });
});
