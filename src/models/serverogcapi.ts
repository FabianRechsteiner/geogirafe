// SPDX-License-Identifier: Apache-2.0
import { ConformanceLevel } from '../tools/ogcapi/ogcapiconformance';

export default class ServerOgcApi {
  public url: string;
  public conformsTo?: Record<ConformanceLevel, boolean>;

  public constructor(url: string) {
    this.url = url;
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';

export const OgcApiDefaultEncoding = 'application/json';

export type OgcApiLinksResponse = {
  href: string;
  rel: string;
  type?: string;
  title?: string;
  hreflang?: string;
  length?: number;
};
