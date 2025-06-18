import { Feature } from 'ol';
import { Geometry } from 'ol/geom';
import StateManager from '../state/statemanager';
import OgcApiFeaturesClient, { OgcApiFeaturesClientOptions } from './ogcapifeaturesclient';
import OgcApiManager from './ogcapimanager';
import ServerOgcApi, { LayerOapif } from '../../models/serverogcapi';
import OgcApiFeaturesClientGeorama from './ogcapifeaturesclientgeorama';
import OgcApiFeaturesClientGmf from './ogcapifeaturesclientgmf';

/**
 * Manages interaction between the app and an OGC API Features client (Oapif).
 */
export default class OgcApiFeaturesManager extends OgcApiManager<OgcApiFeaturesClient, OgcApiFeaturesClientOptions> {
  stateManager: StateManager;

  get state() {
    return this.stateManager.state;
  }

  constructor(type: string) {
    super(type);

    this.stateManager = StateManager.getInstance();

    // Register the default client
    this.registerClientClass('default', OgcApiFeaturesClient);
    this.registerClientClass('georama', OgcApiFeaturesClientGeorama);
    this.registerClientClass('gmf', OgcApiFeaturesClientGmf);
  }

  public getClientId(server: ServerOgcApi): string {
    return server.url ?? '';
  }

  async getItemTemplate(layer: LayerOapif): Promise<Record<string, string | number | null>> {
    this.state.loading = true;
    try {
      const queryables = await this.getClient(layer.server).getQueryables(layer.collectionId);
      if (queryables?.properties) {
        return Object.fromEntries(
          Object.entries(queryables?.properties)
            .filter(([key]) => !['id', 'geometry'].includes(key))
            .map(([key]) => [key, null])
        );
      } else {
        return {};
      }
    } catch {
      return {};
    } finally {
      this.state.loading = false;
    }
  }

  async getItems(layer: LayerOapif, bbox?: number[], bboxCrs?: string): Promise<Feature<Geometry>[]> {
    this.state.loading = true;
    try {
      return await this.getClient(layer.server).getItems(layer.collectionId, bbox, bboxCrs);
    } catch {
      return [];
    } finally {
      this.state.loading = false;
    }
  }

  async getItem(layer: LayerOapif, featureId: string): Promise<Feature<Geometry> | undefined> {
    this.state.loading = true;
    try {
      return await this.getClient(layer.server).getItem(layer.collectionId, featureId, layer.crs);
    } catch {
      return undefined;
    } finally {
      this.state.loading = false;
    }
  }

  async createItem(layer: LayerOapif, feature: Feature<Geometry>): Promise<boolean> {
    this.state.loading = true;
    try {
      return await this.getClient(layer.server).createItem(layer.collectionId, feature);
    } catch {
      return false;
    } finally {
      this.state.loading = false;
    }
  }

  async updateItem(layer: LayerOapif, featureId: string, feature: Feature<Geometry>): Promise<void> {
    this.state.loading = true;
    try {
      return await this.getClient(layer.server).updateItem(layer.collectionId, featureId, feature);
    } finally {
      this.state.loading = false;
    }
  }

  async deleteItem(layer: LayerOapif, featureId: string): Promise<void> {
    this.state.loading = true;
    try {
      await this.getClient(layer.server).deleteItem(layer.collectionId, featureId);
    } finally {
      this.state.loading = false;
    }
  }
}
