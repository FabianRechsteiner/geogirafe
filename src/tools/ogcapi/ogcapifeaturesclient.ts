import { Feature } from 'ol';
import { Geometry } from 'ol/geom';
import { GeoJSON } from 'ol/format';
import OgcApiClient from './ogcapiclient';
import ServerOgcApiFeatures, { OapifCollection, OapifSchemaResponse } from '../../models/serverogcapifeatures';
import ServerOgc from '../../models/serverogc';
import { transformExtent } from 'ol/proj';
import { Extent } from 'ol/extent';
import { HttpMethod, OgcApiDefaultEncoding, OgcApiLinksResponse } from '../../models/serverogcapi';
import { serverConformsTo } from './ogcapiconformance';
import { reprojectGeometry } from '../utils/olutils';

export type OgcApiFeaturesClientOptions = {
  crs?: string;
};

// Default coordinate reference system used by OAPIF and GeoJson: WGS84 in lon / lat
const default_crs = 'EPSG:4326';

/**
 * Class representing an OGC API Features (OAPIF) client that interacts with a server implementing
 * the OGC API - Features standard. This class provides functionality to fetch, manage, and
 * manipulate collections and their spatial data from the server.
 *
 * Extends `OgcApiClient<ServerOgcApiFeatures>`: Provides base client functionalities.
 */
export default class OgcApiFeaturesClient extends OgcApiClient<ServerOgcApiFeatures> {
  private collections: Record<string, OapifCollection> = {};

  constructor(serverConfig: ServerOgc) {
    super(serverConfig);
  }

  protected getUrl(): string {
    return this.serverConfig.urlOapif ?? '';
  }

  protected async loadDescribeServer(): Promise<ServerOgcApiFeatures> {
    const server = new ServerOgcApiFeatures(this.url);
    const conformance = await this.loadConformance();
    server.conformsTo = serverConformsTo(conformance);
    return server;
  }

  public async getCollections(): Promise<OapifCollection[]> {
    const url = `${this.url}/collections?f=json`;
    const response = await this.fetchAll(url, 'collections', this.getFetchOptions());
    if (response.length > 0 && 'collections' in response[0]) {
      return response[0]['collections'];
    } else {
      return [];
    }
  }

  /**
   * Retrieves a collection by its ID. If the collection is not already cached, it fetches it from the remote resource,
   * sanitizes its links, and stores it locally.
   */
  public async getCollection(collectionId: string): Promise<OapifCollection> {
    if (collectionId in this.collections) {
      return this.collections[collectionId];
    }
    const url = `${this.url}/collections/${collectionId}?f=json`;
    const response = await fetch(url, this.getFetchOptions());
    if (!response?.ok) {
      throw new Error(`Failed to get collection: ${response?.status} - ${response?.statusText}`);
    }
    const collection: OapifCollection = await response.json();
    // Sanitize and save to store
    collection.links = this.sanitizeLinks(url, collection.links);
    this.collections[collectionId] = collection;
    return collection;
  }

  /**
   * Retrieves the schema associated with a specified collection.
   */
  public async getSchema(collectionId: string): Promise<OapifSchemaResponse> {
    const server = await this.getServer();
    if (!server.conformsTo?.ogcapi_features_simple_write) {
      throw new Error('OGC API Features client does not support schemas');
    }
    const relation = 'http://www.opengis.net/def/rel/ogc/1.0/schema'; // NOSONAR
    return this.getCollectionRelation(collectionId, relation, 'application/schema+json');
  }

  public async getQueryables(collectionId: string): Promise<OapifSchemaResponse> {
    const server = await this.getServer();
    if (!server.conformsTo?.ogcapi_features_query) {
      throw new Error('OGC API Features client does not support querying');
    }
    const relation = 'http://www.opengis.net/def/rel/ogc/1.0/queryables'; // NOSONAR
    return this.getCollectionRelation(collectionId, relation, 'application/schema+json');
  }

  /**
   * Retrieves the related resource for a specified collection and relation type (e.g. `schema`, `self`, `parent`, etc.)
   */
  public async getCollectionRelation(
    collectionId: string,
    relation: string,
    encodingType: string = OgcApiDefaultEncoding
  ): Promise<any> {
    const collection = await this.getCollection(collectionId);

    const link = collection.links.find(
      (link: OgcApiLinksResponse) => link.rel === relation && (!('type' in link) || link.type === encodingType)
    )?.href;
    if (!link) {
      throw new Error(`OGC API collection '${collectionId}' does not support '${relation}'}`);
    }
    const response = await fetch(link, this.getFetchOptions());
    if (!response?.ok) {
      throw new Error(`Failed to get ${relation}: ${response?.status} - ${response?.statusText}`);
    }
    if (encodingType.includes('json')) {
      return await response.json();
    } else {
      return response;
    }
  }

  /**
   * Retrieves items from a specified collection, optionally applying filters like CRS (Coordinate Reference System),
   * spatial extent, and limit.
   */
  public async getItems(
    collectionId: string,
    crsCode?: string,
    extent?: number[],
    limit?: number
  ): Promise<Feature<Geometry>[]> {
    const url = new URL(`${this.url}/collections/${collectionId}/items?f=json`);

    let crsIdentifier;
    if (crsCode) {
      crsIdentifier = await this.getCrsIdentifier(collectionId, crsCode);
      if (crsIdentifier) {
        url.searchParams.append('crs', crsIdentifier);
      }
    }
    if (extent) {
      extent = await this.reprojectExtentToSupportedCrs(collectionId, extent, crsCode);
      url.searchParams.append('bbox', extent.join(','));
      if (crsIdentifier) {
        url.searchParams.append('bbox-crs', crsIdentifier);
      }
    }
    // If no limit is set, set a very high limit. This is to overwrite very low default limits that lead to many
    // requests and long waiting times. If the server has a lower limit, it will enforce it independent of this limit.
    limit = limit ?? 9999;
    url.searchParams.append('limit', limit.toString());

    const responses = await this.fetchAll(url, 'features', this.getFetchOptions());

    const items: Feature<Geometry>[] = [];
    const geoJsonReader = new GeoJSON();
    responses.forEach((response) => {
      items.push(...geoJsonReader.readFeatures(response, {}));
    });
    return items;
  }

  /**
   * Retrieves a single item from the specified collection by its ID.
   */
  public async getItem(collectionId: string, itemId: string, crsCode?: string): Promise<Feature<Geometry>> {
    const url = new URL(`${this.url}/collections/${collectionId}/items/${itemId}?f=json`);

    // Specify the request CRS
    if (crsCode) {
      const crsIdentifier = await this.getCrsIdentifier(collectionId, crsCode);
      if (crsIdentifier) {
        url.searchParams.append('crs', crsIdentifier);
      }
    }

    const response = await fetch(url, this.getFetchOptions());

    if (!response.ok) {
      throw new Error(`Failed to get item: ${response.status} - ${response.statusText}`);
    }

    const responseJson = await response.json();
    let createdItem = new GeoJSON().readFeature(responseJson);
    if (Array.isArray(createdItem)) {
      createdItem = createdItem[0];
    }
    return createdItem;
  }

  /**
   * Creates an item in the specified collection with the specified geometry and CRS code.
   * Geometries are reprojected if the server does not support the items current CRS.
   */
  public async createItem(collectionId: string, item: Feature<Geometry>, crsCode: string): Promise<boolean> {
    const url = `${this.url}/collections/${collectionId}/items`;

    // Reproject geometry to the collection storage CRS if necessary
    item = await this.reprojectItemToStorageCrs(collectionId, item, crsCode);
    // Add CRS header information
    const crsIdentifier = await this.getStorageCrs(collectionId);
    const fetchOptions = this.getFetchOptions('POST', crsIdentifier);

    const geoJson = new GeoJSON().writeFeatureObject(item);
    fetchOptions.body = JSON.stringify(geoJson);

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`Failed to create feature: ${response.status} - ${response.statusText}`);
    }
    return true;
  }

  /**
   * Updates an existing item in the specified collection.
   */
  public async updateItem(
    collectionId: string,
    itemId: string,
    item: Feature<Geometry>,
    crsCode: string
  ): Promise<boolean> {
    const url = `${this.url}/collections/${collectionId}/items/${itemId}`;

    // Reproject geometry to the collection storage CRS if necessary
    item = await this.reprojectItemToStorageCrs(collectionId, item, crsCode);
    // Add CRS header information
    const crsIdentifier = await this.getStorageCrs(collectionId);
    const fetchOptions = this.getFetchOptions('PUT', crsIdentifier);

    const geoJson = new GeoJSON().writeFeatureObject(item);
    fetchOptions.body = JSON.stringify(geoJson);

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`Failed to update feature: ${response.status} - ${response.statusText}`);
    }
    return true;
  }

  /**
   * Deletes an item from a specific collection.
   */
  public async deleteItem(collectionId: string, itemId: string): Promise<boolean> {
    const url = `${this.url}/collections/${collectionId}/items/${itemId}`;

    const fetchOptions = this.getFetchOptions('DELETE');
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`Failed to delete feature: ${response.status} - ${response.statusText}`);
    }
    return true;
  }

  /**
   * Retrieves the CRS (Coordinate Reference System) identifier for a specific collection based on the provided CRS code.
   * This is necessary because CRS identifiers can vary slightly (e.g. http vs https) between servers,
   * and it's best to use the identifiers provided by the server.
   */
  private async getCrsIdentifier(collectionId: string, crsCode: string): Promise<string | undefined> {
    crsCode = crsCode.replace('EPSG:', '');
    // Check the supported CRS for the current collection
    const collection = await this.getCollection(collectionId);
    // If crs code is WGS84, search for default crs with identifier `CRS84`
    if (crsCode === '4326') {
      return collection.crs?.find((crs: string) => crs.split('/').includes('CRS84'));
    } else {
      return collection.crs?.find((crs: string) => crs.split('/').includes(crsCode));
    }
  }

  private getEpsgCodeFromCrsIdentifier(crsIdentifier: string): string {
    if (crsIdentifier.includes('CRS84')) {
      return 'EPSG:4326';
    } else {
      return `EPSG:${crsIdentifier.trim().split('/').reverse()[0] ?? 4326}`;
    }
  }

  /**
   * Checks if the provided extent's coordinate reference system (CRS) is supported by a given collection
   * and reprojects the extent if necessary.
   */
  private async reprojectExtentToSupportedCrs(
    collectionId: string,
    extent: number[] | Extent,
    crsCode: string = default_crs
  ): Promise<number[]> {
    const crsIdentifier = await this.getCrsIdentifier(collectionId, crsCode);
    if (!crsIdentifier) {
      // If the current extent's CRS isn't supported, we reproject to the default CRS WGS84
      extent = transformExtent(extent, this.state.projection, default_crs);
    }
    return extent;
  }

  /**
   * Retrieves the storage coordinate reference system (CRS) for a specified collection.
   * The storageCrs information is only available if the server supports part 2 of the OGC API Features specification.
   */
  private async getStorageCrs(collectionId: string): Promise<string> {
    // Check the supported CRS for the current collection
    const collection = await this.getCollection(collectionId);
    let storageCrs: string | undefined;
    if (collection.storageCrs) {
      storageCrs = collection.storageCrs;
    } else {
      storageCrs = await this.getCrsIdentifier(collectionId, default_crs);
    }
    if (!storageCrs) {
      throw new Error(
        'Not able to save feature: The OAPIF server does not specify a storage coordinate reference system (crs) ' +
          'and also does not support the default WGS84.'
      );
    }
    return storageCrs;
  }

  /**
   * When performing a write operation, reproject the feature geometry to match the storage coordinate reference system
   * (CRS) of the server. If no storage CRS is specified, geometries are reprojected to WGS84 lon / lat,
   * which is the default CRS for OAPIF and GeoJson.
   */
  private async reprojectItemToStorageCrs(collectionId: string, item: Feature<Geometry>, itemCrsCode: string) {
    // if no storage crs is specified, defaults to default_crs
    const storageCrs = await this.getStorageCrs(collectionId);
    const storageEpsgCode = this.getEpsgCodeFromCrsIdentifier(storageCrs);
    // If the current crs doesn't fit the storage coordinate system, reproject the item geometry
    const geometry = item.getGeometry();
    if (itemCrsCode !== storageEpsgCode && geometry) {
      const reprojectedGeometry = reprojectGeometry(geometry, itemCrsCode, storageEpsgCode);
      item.setGeometry(reprojectedGeometry);
    }
    return item;
  }

  /**
   * Expands the method from OgcApiClient by customizing headers to support GeoJson content and optional CRS identifier.
   */
  protected getFetchOptions(method: HttpMethod = 'GET', crsIdentifier?: string): RequestInit {
    const fetchOptions = super.getFetchOptions(method);

    // Add header info about the request body
    if (['PUT', 'POST'].includes(method)) {
      const headers = new Headers(fetchOptions?.headers);
      headers.set('Content-Type', 'application/geo+json');

      if (crsIdentifier) {
        headers.set('Content-Crs', crsIdentifier);
      }
      fetchOptions.headers = headers;
    }
    return fetchOptions;
  }
}
