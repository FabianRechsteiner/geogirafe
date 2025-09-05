import { Map as OlMap } from 'ol';

import WmsClient, { WmsClientDefault, WmsClientGeoServer, WmsClientMapServer, WmsClientQgis } from './wmsclient';
import ServerOgc from '../../models/serverogc';
import VendorSpecificOgcServerManager from '../vendorspecificogcservermanager';
import LayerWms from '../../models/layers/layerwms';
import WfsFilter from '../wfs/wfsfilter';

export default class WmsManager extends VendorSpecificOgcServerManager<WmsClient, OlMap> {
  map?: OlMap;

  constructor(type: string) {
    super(type);

    // Register the default client
    this.registerClientClass('default', WmsClientDefault);
    this.registerClientClass('geoserver', WmsClientGeoServer);
    this.registerClientClass('mapserver', WmsClientMapServer);
    this.registerClientClass('qgisserver', WmsClientQgis);
  }

  public getClientId(ogcServer: ServerOgc): string {
    return ogcServer.uniqueWmsQueryId;
  }
  public createClient(clientClass: new (os: ServerOgc, map: OlMap) => WmsClient, ogcServer: ServerOgc): WmsClient {
    return new clientClass(ogcServer, this.map as OlMap);
  }

  selectFeatures(extent: number[]) {
    for (const client of this._clients.values()) {
      client.selectFeatures(extent);
    }
  }

  selectFeaturesByQuery(query: WfsFilter[], layer: LayerWms) {
    const client = this.getClient(layer.ogcServer);
    if (!client) {
      throw new Error(`Cannot select features by query: no client found for layer ${layer.name}`);
    }
    client.selectFeaturesByQuery(query);
  }

  public refreshZIndexes() {
    for (const client of this._clients.values()) {
      client.refreshZIndexes();
    }
  }

  removeAllBasemapLayers() {
    for (const client of this._clients.values()) {
      client.removeAllBasemapLayers();
    }
  }
}
