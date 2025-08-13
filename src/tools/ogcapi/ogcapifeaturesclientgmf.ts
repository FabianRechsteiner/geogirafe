import OgcApiFeaturesClient from './ogcapifeaturesclient';
import Feature from 'ol/Feature';
import ServerOgc from '../../models/serverogc';
import { OapifSchemaResponse, OapifPropertySchema } from '../../models/serverogcapifeatures';

export default class OgcApiFeaturesClientGmf extends OgcApiFeaturesClient {
  constructor(serverConfig: ServerOgc) {
    super(serverConfig);
  }

  /**
   * POC overwrite: The demo server does not support schema requests. We therefore create a very simple schema based on
   * the first item of the collection.
   */
  public async getSchema(collectionId: string): Promise<OapifSchemaResponse> {
    const items = await this.getItems(collectionId, undefined, undefined, 1);
    const item: Feature = items[0];
    const properties: Record<string, OapifPropertySchema> = Object.fromEntries(
      Object.entries(item.getProperties())
        .filter(([key, _value]) => ['fid', 'name', 'type'].includes(key))
        .map(([key, value]) => [key, { type: typeof value }])
    );
    // Add geometry information
    properties['geometry'] = {
      'format': `geometry-${item.getGeometry()!.getType().toLowerCase()}`,
      'x-ogc-role': 'primary-geometry'
    };
    // mark fid as primary key
    properties['fid']['x-ogc-role'] = 'id';

    return {
      properties: properties
    };
  }
}
