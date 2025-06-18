import { Feature } from 'ol';
import { Geometry } from 'ol/geom';
import { GeoJSON } from 'ol/format';
import StateManager from '../state/statemanager';
import { OgcApiQueryablesResponse } from '../../models/serverogcapi';
import OgcApiClient from './ogcapiclient';

// POC demo variables
export const DEMO_INSTANCES: Record<string, any> = {
  GEORAMA: {
    url: 'https://demo.georama.io/features',
    name: 'Georama Rivers',
    collectionId: '60c4f0d6-2d57-4db1-bf7e-0f0f8f9c1e36',
    geometryType: 'MultiLineString',
    attributeName: 'FNODE_',
    attributeType: 'number',
    crs: 'http://www.opengis.net/def/crs/EPSG/0/2056', // NOSONAR
    credentials: 'editor:6YPhizVs4BZPvm', // Credentials for demo env, not a risk
    serverType: 'georama'
  },
  GMF: {
    url: 'https://geomapfish-demo-2-9.camptocamp.com/mapserv_proxy/QGIS_Server/wfs3',
    name: 'GeoMapFish Points',
    collectionId: 'points',
    geometryType: 'Point',
    attributeName: 'name',
    attributeType: 'text',
    crs: 'http://www.opengis.net/def/crs/EPSG/0/2056', // NOSONAR
    credentials: undefined,
    serverType: 'gmf'
  }
};

export type OgcApiFeaturesClientOptions = {
  url: string;
};

const default_crs = 'https://www.opengis.net/def/crs/OGC/1.3/CRS84';

export default class OgcApiFeaturesClient extends OgcApiClient {
  constructor(options: OgcApiFeaturesClientOptions) {
    super(options);
    this.url = options.url;
    this.stateManager = StateManager.getInstance();
  }

  async getCollections() {
    throw new Error('Not implemented');
  }

  async getCollection(_collectionId: string) {
    throw new Error('Not implemented');
  }

  async getSchema(collectionId: string): Promise<any> {
    const relation = 'http://www.opengis.net/def/rel/ogc/1.0/schema'; // NOSONAR
    return this.getByRelationAndType(collectionId, relation, 'application/schema+json');
  }

  async getQueryables(collectionId: string): Promise<OgcApiQueryablesResponse> {
    const relation = 'http://www.opengis.net/def/rel/ogc/1.0/queryables'; // NOSONAR
    return this.getByRelationAndType(collectionId, relation, 'application/schema+json');
  }

  async getItems(collectionId: string, extent?: number[], crs: string = default_crs): Promise<Feature<Geometry>[]> {
    let currentUrl = `${this.url}/collections/${collectionId}/items?crs=${crs}&f=json&limit=500`;
    if (extent) {
      currentUrl += `&bbox=${extent.join(',')}`;
      currentUrl += `&bbox-crs=${crs}`;
    }
    const fetchOptions = this.getFetchOptions();
    const features: Feature<Geometry>[] = [];

    const responses = await this.fetchAll(currentUrl, fetchOptions);

    const geoJsonReader = new GeoJSON();
    responses.forEach((response) => {
      features.push(...geoJsonReader.readFeatures(response, {}));
    });
    return features;
  }

  async getItem(collectionId: string, itemId: string, crs: string = default_crs): Promise<Feature<Geometry>> {
    const url = `${this.url}/collections/${collectionId}/items/${itemId}?crs=${crs}&f=json`;

    const response = await fetch(url, this.getFetchOptions());

    if (!response.ok) {
      throw new Error(`Failed to get item: ${response.status} - ${response.statusText}`);
    }

    const responseJson = await response.json();
    let createdFeature = new GeoJSON().readFeature(responseJson);
    if (Array.isArray(createdFeature)) {
      createdFeature = createdFeature[0];
    }
    return createdFeature;
  }

  async createItem(collectionId: string, item: Feature<Geometry>): Promise<boolean> {
    const url = `${this.url}/collections/${collectionId}/items`;

    const geoJson = new GeoJSON().writeFeatureObject(item);
    const fetchOptions = this.getFetchOptions('POST');
    fetchOptions.headers = new Headers(fetchOptions?.headers);
    fetchOptions.headers.set('Content-Type', 'application/geo+json');
    fetchOptions.body = JSON.stringify(geoJson);

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`Failed to create feature: ${response.status} - ${response.statusText}`);
    }
    return true;
  }

  async updateItem(_collectionId: string, _itemId: string, _item: Feature<Geometry>): Promise<void> {
    throw new Error('Not implemented');
  }

  async deleteItem(_collectionId: string, _itemId: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
