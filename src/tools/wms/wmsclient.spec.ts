import { it, expect, describe, vi } from 'vitest';

import Map from 'ol/Map';

import WmsManager from './wmsmanager';
import { mockOgcServers, mockWmsLayers } from '../tests/wmswfsmanagermocking';
import MockHelper from '../tests/mockhelper';
//import ConfigManager from '../configuration/configmanager';

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('WMS Client tests', () => {
  MockHelper.startMocking();

  const wmsManager = WmsManager.getInstance();
  wmsManager.map = new Map({ layers: [] });

  // QGIS OgcServers
  const ogcServerQg1 = mockOgcServers['QGIS-1-has-wfs'];
  const ogcServerQg2 = mockOgcServers['QGIS-2-has-wfs'];

  // QGIS layerWms
  const layerQg1L1 = mockWmsLayers['qgis1-layer1'];
  const layerQg1L2 = mockWmsLayers['qgis1-layer2'];
  const layerQg1L3 = mockWmsLayers['qgis1-layer3'];
  const layerQg2L1 = mockWmsLayers['qgis2-layer1'];

  // QGIS clients
  // from layers
  const wmsClientQg1L1 = wmsManager.getClient(layerQg1L1);
  const wmsClientQg2L1 = wmsManager.getClient(layerQg2L1);

  // MapServer layers
  /*
  const wmsClientMsL1 = wmsManager.getClient(mockWmsLayers[x])
  const wmsClientMsL2 = wmsManager.getClient(mockWmsLayers[x])
  const wmsClientMsL3 = wmsManager.getClient(mockWmsLayers[x])
  */

  describe('WmsClient.addLayer()', () => {
    MockHelper.startMocking();
    wmsClientQg1L1.addLayer(layerQg1L1);
    wmsClientQg1L1.addLayer(layerQg1L2);
    wmsClientQg1L1.addLayer(layerQg1L3);
    wmsClientQg2L1.addLayer(layerQg2L1);

    it('Layers QG1L1 and QG1L3 should have been added to client as standard Layers (no opacity/filter/swiped)', () => {
      expect(wmsClientQg1L1.layerInStandardLayers(layerQg1L1)).toEqual(true);
      expect(wmsClientQg1L1.layerInStandardLayers(layerQg1L3)).toEqual(true);
      expect(wmsClientQg1L1.layerIsIndependantLayer(layerQg1L1)).toEqual(false);
      expect(wmsClientQg1L1.layerIsIndependantLayer(layerQg1L3)).toEqual(false);
    });

    it('Layer QG1L2 has opacity and should be an independantLayer, not a standard Layer', () => {
      expect(wmsClientQg1L1.layerIsIndependantLayer(layerQg1L2)).toEqual(true);
      expect(wmsClientQg1L1.layerInStandardLayers(layerQg1L2)).toEqual(false);
    });
  });

  describe('WmsClient.selectFeatures()', () => {
    MockHelper.startMocking();
    // add selection param wmsClientQg1 standardLayers + 1 wmsClientQg1 independantLayer (layerQg1L2)
    wmsClientQg1L1.selectFeatures([0, 1, 2, 3]);
    // add selection param wmsClientQg2 standardLayers
    wmsClientQg2L1.selectFeatures([0, 1, 2, 3]);

    it('should have added 3 SelectionParams: wmsClientQg1 standardLayers, 1 wmsClientQg1 independantLayers, wmsClientQg2 standardLayers', () => {
      expect(wmsClientQg1L1.state.selection.selectionParameters.length).toEqual(3);

      expect(wmsClientQg1L1.state.selection.selectionParameters[0]._layers.map((l) => l.name)).toEqual([
        'qgis1-layer1',
        'qgis1-layer3'
      ]);
      expect(wmsClientQg1L1.state.selection.selectionParameters[0]._ogcServer).toEqual(ogcServerQg1);

      expect(wmsClientQg1L1.state.selection.selectionParameters[1]._layers.map((l) => l.name)).toEqual([
        'qgis1-layer2'
      ]);
      expect(wmsClientQg1L1.state.selection.selectionParameters[1]._ogcServer).toEqual(ogcServerQg1);

      expect(wmsClientQg1L1.state.selection.selectionParameters[2]._layers.map((l) => l.name)).toEqual([
        'qgis2-layer1'
      ]);
      expect(wmsClientQg1L1.state.selection.selectionParameters[2]._ogcServer).toEqual(ogcServerQg2);
    });
  });

  describe('WmsClient.GetFeatureInfo()', () => {
    MockHelper.startMocking();
    const selectionParams = wmsClientQg1L1.state.selection.selectionParameters;
    const selectionParam1Qg1 = selectionParams[0];
    const selectionParam2Qg1 = selectionParams[1];
    const selectionParam1Qg2 = selectionParams[2];

    // @ts-ignore
    const getFeatureInfoUrlQg1 = vi.spyOn(wmsClientQg1L1, 'getFeatureInfoUrl');
    // @ts-ignore
    const getFeatureInfoUrlQg2 = vi.spyOn(wmsClientQg2L1, 'getFeatureInfoUrl');
    fetchMock.mockResolvedValue({ text: () => '' });

    wmsClientQg1L1.getFeatureInfo(selectionParam1Qg1);
    it('should have fetched the url corresponding to SelectionPara QGIS server 1 standard layers', () => {
      const url =
        'https://qgis-wms-1.test.url?QUERY_LAYERS=qgis1-layer1%2Cqgis1-layer3&INFO_FORMAT=application%2Fvnd.ogc.gml&REQUEST=GetFeatureInfo&SERVICE=WMS&VERSION=1.3.0&FORMAT=image%2Fpng&STYLES=&TRANSPARENT=true&LAYERS=qgis1-layer1%2Cqgis1-layer3&FEATURE_COUNT=300&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG%3A2056&BBOX=-5301.5%2C-5300.5%2C5303.5%2C5304.5';
      const getFeatureInfoUrlReturn: Record<string, string> = {};
      getFeatureInfoUrlReturn[url] = 'qgis1-layer1';
      expect(getFeatureInfoUrlQg1).toHaveReturnedWith(getFeatureInfoUrlReturn);
      expect(fetchMock).toHaveBeenCalledWith(url);
    });
    wmsClientQg1L1.getFeatureInfo(selectionParam2Qg1);
    it('should have fetched the url corresponding to SelectionPara QGIS server 1 independant layer "qgis1-layer2"', () => {
      const url =
        'https://qgis-wms-1.test.url?QUERY_LAYERS=qgis1-layer2&INFO_FORMAT=application%2Fvnd.ogc.gml&REQUEST=GetFeatureInfo&SERVICE=WMS&VERSION=1.3.0&FORMAT=image%2Fpng&STYLES=&TRANSPARENT=true&LAYERS=qgis1-layer2&FEATURE_COUNT=300&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG%3A2056&BBOX=-5301.5%2C-5300.5%2C5303.5%2C5304.5';
      const getFeatureInfoUrlReturn: Record<string, string> = {};
      getFeatureInfoUrlReturn[url] = 'qgis1-layer2';
      expect(getFeatureInfoUrlQg1).toHaveReturnedWith(getFeatureInfoUrlReturn);
      expect(fetchMock).toHaveBeenCalledWith(url);
    });
    wmsClientQg2L1.getFeatureInfo(selectionParam1Qg2);
    it('should have fetched the url corresponding to SelectionPara QGIS server 2 standard layers', () => {
      const url =
        'https://qgis-wms-2.test.url?QUERY_LAYERS=qgis2-layer1&INFO_FORMAT=application%2Fvnd.ogc.gml&REQUEST=GetFeatureInfo&SERVICE=WMS&VERSION=1.3.0&FORMAT=image%2Fpng&STYLES=&TRANSPARENT=true&LAYERS=qgis2-layer1&FEATURE_COUNT=300&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG%3A2056&BBOX=-5301.5%2C-5300.5%2C5303.5%2C5304.5';
      const getFeatureInfoUrlReturn: Record<string, string> = {};
      getFeatureInfoUrlReturn[url] = 'qgis2-layer1';
      expect(getFeatureInfoUrlQg2).toHaveReturnedWith(getFeatureInfoUrlReturn);
      expect(fetchMock).toHaveBeenCalledWith(url);
    });
  });
  MockHelper.stopMocking();
});
