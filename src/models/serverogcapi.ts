import { GeometryType } from 'ol/render/webgl/MixedGeometryBatch';

export default class ServerOgcApi {
  name: string;
  url: string;
  type: string;

  constructor(name: string, url: string, type: string) {
    this.name = name;
    this.url = url;
    this.type = type;
  }
}

export type OgcApiLinksResponse = {
  href: string;
  rel: string;
  type?: string;
  title?: string;
  hreflang?: string;
  length?: number;
};

export type OgcApiQueryablesResponse = {
  $id?: string;
  $schema?: string;
  title?: string;
  description?: string;
  type?: string;
  properties: Record<
    string,
    {
      'title'?: string;
      'description'?: string;
      'type'?: string;
      'format'?: string;
      'x-ogc-role'?: string;
      'minimum'?: number;
      'maximum'?: number;
      'enum'?: Array<string | number>;
    }
  >;
};

// POC demo layer definition
export type LayerOapif = {
  url: string;
  collectionId: string;
  crs: string;
  credentials?: string;
  geometryType: GeometryType;
  attributeName: string;
  attributeType: string;
  serverType: string;
  server: ServerOgcApi;
};
