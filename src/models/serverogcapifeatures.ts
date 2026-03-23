// SPDX-License-Identifier: Apache-2.0
import ServerOgcApi, { OgcApiLinksResponse } from './serverogcapi';
import ServerOgc from './serverogc';

export const oapifNumericTypes: string[] = ['integer', 'number', 'double', 'float', 'decimal', 'int', 'int32', 'int64'];

export const oapifTextTypes: string[] = ['string', 'date', 'time', 'datetime', 'date-time', 'duration'];

export const oapifTemporalTypes: string[] = ['date', 'time', 'date-time', 'datetime'];

export const oapifPropertyTypesList = [...oapifNumericTypes, ...oapifTextTypes, ...oapifTemporalTypes] as const;
export type oapifPropertyTypes = (typeof oapifPropertyTypesList)[number];

export default class ServerOgcApiFeatures extends ServerOgcApi {
  public constructor(url: string) {
    super(url);
  }
}

export type OapifSchemaResponse = {
  $id?: string;
  $schema?: string;
  title?: string;
  description?: string;
  type?: string;
  properties: Record<string, OapifPropertySchema>;
};

export type OapifPropertySchema = {
  'title'?: string;
  'description'?: string;
  'type'?: oapifPropertyTypes;
  'format'?: string;
  'x-ogc-role'?: string;
  'x-ogc-propertySeq'?: number;
  'readOnly'?: boolean;
  'required'?: boolean;
  'maxLength'?: number;
  'minimum'?: number;
  'maximum'?: number;
  'enum'?: Array<string | number>;
  'oneOf'?: { const: string; value: string }[];
  'x-orc-codelistUri'?: string;
};

export type OapifCollection = {
  id: string;
  title: string;
  description?: string;
  links: OgcApiLinksResponse[];
  itemType: string;
  extent?: {
    spatial: {
      bbox: number[][];
      crs: string;
    };
  };
  crs?: string[];
  storageCrs?: string;
};

// POC demo layer definition
export type OapifLayer = {
  url: string;
  collectionId: string;
  collectionTitle: string;
  displayName: string;
  crs: string;
  credentials?: string;
  geometryType: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
  attributeName: string;
  attributeType: string;
  serverType: string;
  server: ServerOgc;
};
