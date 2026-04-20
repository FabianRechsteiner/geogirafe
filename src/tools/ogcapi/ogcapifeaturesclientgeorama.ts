// SPDX-License-Identifier: Apache-2.0
import OgcApiFeaturesClient from './ogcapifeaturesclient';
import ServerOgc from '../../models/serverogc';
import { OapifCollection } from '../../models/serverogcapifeatures';
import IGirafeContext from '../context/icontext';
import { OgcApiClientOptions } from './ogcapiclient';

export default class OgcApiFeaturesClientGeorama extends OgcApiFeaturesClient {
  public constructor(serverConfig: ServerOgc, opt: OgcApiClientOptions, context: IGirafeContext) {
    super(serverConfig, opt, context);
  }

  /**
   * POC overwrite: Upper/lowercase issues with collection property `storageCrs`: pygeoapi uses `storageCRS`.
   */
  public override async getCollection(collectionId: string): Promise<OapifCollection> {
    const collection = await super.getCollection(collectionId);
    if (Object.keys(collection).includes('storageCRS')) {
      // @ts-expect-error Wrong property name form server
      collection.storageCrs = collection.storageCRS;
    }
    return collection;
  }
}
