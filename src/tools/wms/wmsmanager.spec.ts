import { it, expect, describe, vi } from 'vitest';

import Map from 'ol/Map';

import { mockOgcServers, mockWmsLayers } from '../tests/wmswfsmanagermocking';
import { WmsClientMapServer, WmsClientQgis } from './wmsclient';
import MockHelper from '../tests/mockhelper';
//import ConfigManager from '../configuration/configmanager';

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('WMS Manager tests', () => {
  let context = MockHelper.startMocking();

  const wmsManager = context.wmsManager;
  // @ts-ignore
  wmsManager.map = new Map({ layers: [] });

  // QGIS OgcServers
  const ogcServerQg1 = mockOgcServers['QGIS-1-has-wfs'];
  const ogcServerMs1 = mockOgcServers['MapServer-1-has-wfs'];

  // QGIS layerWms
  const layerQg1L1 = mockWmsLayers['qgis1-layer1'];
  const layerQg1L2 = mockWmsLayers['qgis1-layer2'];
  const layerQg1L3 = mockWmsLayers['qgis1-layer3'];
  const layerQg2L1 = mockWmsLayers['qgis2-layer1'];

  // QGIS clients
  // from OgcServers
  const wmsClientQgOgcS1 = wmsManager.getClient(ogcServerQg1);
  const wmsClientMsOgcS1 = wmsManager.getClient(ogcServerMs1);
  // from layers
  const wmsClientQg1L1 = wmsManager.getClient(layerQg1L1);
  const wmsClientQg1L2 = wmsManager.getClient(layerQg1L2);
  const wmsClientQg1L3 = wmsManager.getClient(layerQg1L3);
  const wmsClientQg2L1 = wmsManager.getClient(layerQg2L1);

  // MapServer layers
  /*
  const wmsClientMsL1 = wmsManager.getClient(mockWmsLayers[x])
  const wmsClientMsL2 = wmsManager.getClient(mockWmsLayers[x])
  const wmsClientMsL3 = wmsManager.getClient(mockWmsLayers[x])
  */

  describe('WmsManager.getClient()', () => {
    it('should return a WmsClientQGis for a layerWms of type qgisserver', () => {
      // @ts-expect-error: private property
      expect(wmsClientQg1L1.ogcServer.name).toEqual('QGIS-1-has-wfs');
      expect(wmsClientQg1L1 instanceof WmsClientQgis).toEqual(true);
    });

    it('should return a WmsClientMapServer for an OgcServer of type mapserver', () => {
      // @ts-expect-error: private property
      expect(wmsClientMsOgcS1.ogcServer.name).toEqual('MapServer-1-has-wfs');
      expect(wmsClientMsOgcS1 instanceof WmsClientMapServer).toEqual(true);
    });

    it('should return the same WmsClient for all layerWms of the same ogcServer', () => {
      expect(wmsClientQg1L1).toEqual(wmsClientQgOgcS1);
      expect(wmsClientQg1L1).toEqual(wmsClientQg1L2);
      expect(wmsClientQg1L1).toEqual(wmsClientQg1L3);
    });

    it('should return distinct WmsClients for layerWms of different ogcServer', () => {
      expect(wmsClientQg1L1 === wmsClientQg2L1).toEqual(false);
      expect(wmsClientQg1L1 === wmsClientMsOgcS1).toEqual(false);
    });
  });

  MockHelper.stopMocking(context);
});
