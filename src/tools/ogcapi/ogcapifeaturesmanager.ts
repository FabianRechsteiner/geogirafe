import { Feature } from 'ol';
import { Geometry } from 'ol/geom';
import OgcApiFeaturesClient from './ogcapifeaturesclient';
import OgcApiFeaturesClientGeorama from './ogcapifeaturesclientgeorama';
import OgcApiFeaturesClientGmf from './ogcapifeaturesclientgmf';
import LayerWms from '../../models/layers/layerwms';
import ServerOgcApiFeatures, { OapifCollection, OapifLayer } from '../../models/serverogcapifeatures';
import OgcApiFeaturesSchema from './ogcapifeaturesschema';
import ServerOgc from '../../models/serverogc';
import VendorSpecificOgcServerManager from '../vendorspecificogcservermanager';
import { OgcApiClientOptions } from './ogcapiclient';

/**
 * Manages interaction between the GG and an OGC API Features client (OAPIF).
 */
export default class OgcApiFeaturesManager extends VendorSpecificOgcServerManager<
  OgcApiFeaturesClient,
  OgcApiClientOptions
> {
  protected get state() {
    return this.context.stateManager.state;
  }

  public getClientId(ogcServer: ServerOgc): string {
    return ogcServer.urlOapif ?? '';
  }

  public override initializeSingleton() {
    // Register the clients
    this.registerClientClass('default', OgcApiFeaturesClient);
    this.registerClientClass('georama', OgcApiFeaturesClientGeorama);
    this.registerClientClass('gmf', OgcApiFeaturesClientGmf);
  }

  public async getSchema(layer: OapifLayer): Promise<OgcApiFeaturesSchema> {
    this.state.loading = true;
    try {
      const schema = await this.getClient(layer.server).getSchema(layer.collectionId);
      return new OgcApiFeaturesSchema(schema);
    } catch (e) {
      throw new Error(`Unable to get schema: ${e}`);
    } finally {
      this.state.loading = false;
    }
  }

  public async getItems(
    layer: OapifLayer,
    crs?: string,
    bbox?: number[],
    limit?: number
  ): Promise<Feature<Geometry>[]> {
    this.state.loading = true;
    try {
      return await this.getClient(layer.server).getItems(layer.collectionId, crs, bbox, limit);
    } catch {
      return [];
    } finally {
      this.state.loading = false;
    }
  }

  public async getItem(layer: OapifLayer, featureId: string): Promise<Feature<Geometry> | undefined> {
    this.state.loading = true;
    try {
      return await this.getClient(layer.server).getItem(layer.collectionId, featureId, this.state.projection);
    } catch {
      return undefined;
    } finally {
      this.state.loading = false;
    }
  }

  public async createItem(layer: OapifLayer, feature: Feature<Geometry>): Promise<boolean> {
    this.state.loading = true;
    try {
      return await this.getClient(layer.server).createItem(layer.collectionId, feature, this.state.projection);
    } catch {
      void window.gAlert('Failed to create feature', 'Error');
      return false;
    } finally {
      this.state.loading = false;
    }
  }

  public async updateItem(layer: OapifLayer, featureId: string, feature: Feature<Geometry>): Promise<boolean> {
    this.state.loading = true;
    try {
      return await this.getClient(layer.server).updateItem(
        layer.collectionId,
        featureId,
        feature,
        this.state.projection
      );
    } catch {
      void window.gAlert('Failed to update feature', 'Error');
      return false;
    } finally {
      this.state.loading = false;
    }
  }

  public async deleteItem(layer: OapifLayer, featureId: string): Promise<boolean> {
    this.state.loading = true;
    try {
      return await this.getClient(layer.server).deleteItem(layer.collectionId, featureId);
    } catch {
      void window.gAlert('Failed to delete feature', 'Error');
      return false;
    } finally {
      this.state.loading = false;
    }
  }

  public async getServer(ogcServer: ServerOgc): Promise<ServerOgcApiFeatures>;
  public async getServer(layer: LayerWms): Promise<ServerOgcApiFeatures>;
  public async getServer(object: ServerOgc | LayerWms): Promise<ServerOgcApiFeatures> {
    const ogcServer = object instanceof LayerWms ? object.ogcServer : object;
    const client = this.getClient(ogcServer);
    return client.getServer();
  }

  public async getCollectionByTitle(title: string, server: ServerOgc): Promise<OapifCollection | null> {
    const collections = await this.getClient(server).getCollections();
    return collections.find((collection: any) => collection.title === title) ?? null;
  }
}
