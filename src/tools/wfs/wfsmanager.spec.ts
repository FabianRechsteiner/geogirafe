import { it, expect, describe, vi } from 'vitest';

import WfsManager from './wfsmanager';
import { mockOgcServers, mockWmsLayers } from '../tests/wmswfsmanagermocking';
import { WfsClientMapServer, WfsClientQgis } from './wfsclient';
import MockHelper from '../tests/mockhelper';
//import ConfigManager from '../configuration/configmanager';

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('WMS Manager tests', () => {
  MockHelper.startMocking();

  const wfsManager = WfsManager.getInstance();

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
  const wfsClientQgOgcS1 = wfsManager.getClient(ogcServerQg1);
  const wfsClientMsOgcS1 = wfsManager.getClient(ogcServerMs1);
  // from layers
  const wfsClientQg1L1 = wfsManager.getClient(layerQg1L1);
  const wfsClientQg1L2 = wfsManager.getClient(layerQg1L2);
  const wfsClientQg1L3 = wfsManager.getClient(layerQg1L3);
  const wfsClientQg2L1 = wfsManager.getClient(layerQg2L1);

  // MapServer layers
  /*
  const wfsClientMsL1 = wfsManager.getClient(mockWmsLayers[x])
  const wfsClientMsL2 = wfsManager.getClient(mockWmsLayers[x])
  const wfsClientMsL3 = wfsManager.getClient(mockWmsLayers[x])
  */

  describe('WfsManager.getClient()', () => {
    it('should return a WfsClientQGis for a layerWms of type qgisserver', () => {
      expect(wfsClientQg1L1.ogcServer.name).toEqual('QGIS-1-has-wfs');
      expect(wfsClientQg1L1 instanceof WfsClientQgis).toEqual(true);
    });

    it('should return a WfsClientMapServer for an OgcServer of type mapserver', () => {
      expect(wfsClientMsOgcS1.ogcServer.name).toEqual('MapServer-1-has-wfs');
      expect(wfsClientMsOgcS1 instanceof WfsClientMapServer).toEqual(true);
    });

    it('should return the same WfsClient for all layerWms of the same ogcServer', () => {
      expect(wfsClientQg1L1).toEqual(wfsClientQgOgcS1);
      expect(wfsClientQg1L1).toEqual(wfsClientQg1L2);
      expect(wfsClientQg1L1).toEqual(wfsClientQg1L3);
    });

    it('should return distinct WfsClients for layerWms of different ogcServer', () => {
      expect(wfsClientQg1L1 === wfsClientQg2L1).toEqual(false);
      expect(wfsClientQg1L1 === wfsClientMsOgcS1).toEqual(false);
    });
  });

  MockHelper.stopMocking();
});
