import { Map as OlMap } from 'ol';

import WmsClient, { WmsClientDefault, WmsClientGeoServer, WmsClientMapServer, WmsClientQgis } from './wmsclient';
import ServerOgc from '../../models/serverogc';
import VendorSpecificOgcServerManager from '../vendorspecificogcservermanager';
import LayerWms from '../../models/layers/layerwms';
import WfsFilter from '../wfs/wfsfilter';
import IGirafeContext from '../context/icontext';

export default class WmsManager extends VendorSpecificOgcServerManager<WmsClient, OlMap> {
  private readonly map: OlMap;

  constructor(context: IGirafeContext) {
    super(context);
    this.map = this.context.mapManager.getMap();
  }

  override initializeSingleton() {
    // Register the default client
    this.registerClientClass('default', WmsClientDefault);
    this.registerClientClass('geoserver', WmsClientGeoServer);
    this.registerClientClass('mapserver', WmsClientMapServer);
    this.registerClientClass('qgisserver', WmsClientQgis);
    this.registerClientClass('georama.webgis', WmsClientQgis);
  }

  public getClientId(ogcServer: ServerOgc): string {
    return ogcServer.uniqueWmsQueryId;
  }
  public createClient(
    clientClass: new (os: ServerOgc, map: OlMap, context: IGirafeContext) => WmsClient,
    ogcServer: ServerOgc
  ): WmsClient {
    return new clientClass(ogcServer, this.map, this.context);
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
