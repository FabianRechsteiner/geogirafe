import OgcApiFeaturesClient from './ogcapifeaturesclient';
import { DEMO_LAYERS } from './demolayers';
import ServerOgc from '../../models/serverogc';
import { OapifCollection } from '../../models/serverogcapifeatures';
import { HttpMethod } from '../../models/serverogcapi';

export default class OgcApiFeaturesClientGeorama extends OgcApiFeaturesClient {
  constructor(serverConfig: ServerOgc) {
    super(serverConfig);
  }

  /**
   * POC overwrite: Upper/lowercase issues with collection property `storageCrs`: pygeoapi uses `storageCRS`.
   */
  public async getCollection(collectionId: string): Promise<OapifCollection> {
    const collection = await super.getCollection(collectionId);
    if (Object.keys(collection).includes('storageCRS')) {
      // @ts-expect-error Wrong property name form server
      collection.storageCrs = collection.storageCRS;
    }
    return collection;
  }

  /**
  Overwrite base method fetch options because the Georama demo server currently only supports basic auth.
   */
  protected getFetchOptions(method: HttpMethod = 'GET', crsIdentifier?: string): RequestInit {
    const fetchOptions = super.getFetchOptions(method, crsIdentifier);
    const headers = new Headers(fetchOptions?.headers);
    // POC: Only basic auth for now
    headers.set('Authorization', `Basic ${window.btoa(DEMO_LAYERS.GEORAMA.credentials)}`);
    fetchOptions.credentials = 'include';
    fetchOptions.mode = 'cors';
    fetchOptions.headers = headers;
    return fetchOptions;
  }
}
