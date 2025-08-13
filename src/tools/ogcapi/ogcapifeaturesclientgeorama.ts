import OgcApiFeaturesClient from './ogcapifeaturesclient';
import ServerOgc from '../../models/serverogc';
import { OapifCollection } from '../../models/serverogcapifeatures';

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
}
