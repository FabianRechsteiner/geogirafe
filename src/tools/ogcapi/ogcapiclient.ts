import StateManager from '../state/statemanager';
import { OgcApiLinksResponse } from '../../models/serverogcapi';

export type OgcApiOptions = {
  url: string;
};

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';
const default_encoding = 'application/json';

/**
 * This class covers the common part of the OGC API standard described in https://docs.ogc.org/is/19-072/19-072.html.
 * It contains shared methods between clients of different OGC API standards.
 * Any OGC API (Maps, Records, Features, STAC...) shall extend this class.
 */
export default class OgcApiClient {
  stateManager: StateManager;
  url: string;

  get state() {
    return this.stateManager.state;
  }

  constructor(options: OgcApiOptions) {
    this.url = options.url;
    this.stateManager = StateManager.getInstance();
  }

  public async serviceDescription(): Promise<void> {
    throw new Error('Not implemented');
  }

  public async conformance(): Promise<string[]> {
    const url = await this.getLink('conformance');
    let response;
    if (url) {
      response = await fetch(url, this.getFetchOptions());
    }
    if (!response?.ok) {
      throw new Error(`Failed to get conformance: ${response?.status} - ${response?.statusText}`);
    }
    const conformance = await response.json();
    return conformance.conformsTo ?? [];
  }

  public async getByRelationAndType(collectionId: string, relation: string, type: string): Promise<any> {
    const url = await this.getLink(relation, `${this.url}/collections/${collectionId}`, type);
    let response;
    if (url) {
      response = await fetch(url, this.getFetchOptions());
    }
    if (!response?.ok) {
      throw new Error(`Failed to get ${relation}: ${response?.status} - ${response?.statusText}`);
    }
    if (type.includes('json')) {
      return await response.json();
    } else if (type.includes('xml')) {
      return response;
    } else {
      return response;
    }
  }

  public async getLinks(path: string): Promise<OgcApiLinksResponse[]> {
    const response = await fetch(path, this.getFetchOptions());
    if (!response.ok) {
      throw new Error(`Failed to get links: ${response.status} - ${response.statusText}`);
    }
    const jsonResponse = await response.json();
    return jsonResponse.links ?? [];
  }

  public async getLink(
    relation: string,
    path: string = this.url,
    encodingType: string = default_encoding
  ): Promise<string> {
    const links = await this.getLinks(path);
    const link = links.find(
      (link: OgcApiLinksResponse) => link.rel === relation && (!('type' in link) || link.type === encodingType)
    )?.href;
    if (!link) {
      throw new Error(`OGC API resource at '${path}' does not support '${relation}'}`);
    }
    return link;
  }

  public async fetchAll(url: string, fetchOptions: RequestInit): Promise<any[]> {
    const responses = [];

    while (url) {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`Failed to fetch all: ${response.status} - ${response.statusText}`);
      }

      const responseJson = await response.json();
      responses.push(responseJson);

      // Get next page URL if it exists
      url = this.getNextUrl(responseJson, url);
    }
    return responses;
  }

  protected getNextUrl(responseJson: any, _currentUrl: string): string {
    return responseJson.links?.find((link: { rel: string }) => link.rel === 'next')?.href ?? '';
  }

  protected getFetchOptions(method: HttpMethod = 'GET'): RequestInit {
    const fetchOptions: RequestInit = {
      method: method
    };
    fetchOptions.headers = new Headers();
    return fetchOptions;
  }
}
