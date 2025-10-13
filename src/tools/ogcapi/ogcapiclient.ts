import StateManager from '../state/statemanager';
import ServerOgcApi, { OgcApiDefaultEncoding, HttpMethod, OgcApiLinksResponse } from '../../models/serverogcapi';
import ServerOgc from '../../models/serverogc';

/**
 * This class covers the common part of the OGC API standard described in https://docs.ogc.org/is/19-072/19-072.html.
 * It contains shared methods between clients of different OGC API standards.
 * Any OGC API (Maps, Records, Features, STAC...) shall extend this class.
 */
export default abstract class OgcApiClient<Server = ServerOgcApi> {
  protected readonly serverConfig: ServerOgc;
  private server?: Promise<Server>;
  private readonly stateManager: StateManager;
  public initialized: boolean;

  get state() {
    return this.stateManager.state;
  }

  get url(): string {
    return this.getUrl();
  }

  protected constructor(serverConfig: ServerOgc) {
    this.serverConfig = serverConfig;
    this.stateManager = StateManager.getInstance();
    this.initialized = false;
  }

  async getServer(): Promise<Server> {
    return this.describeServer();
  }

  protected async describeServer(): Promise<Server> {
    if (!this.server) {
      this.server = this.loadDescribeServer().then((server) => {
        this.initialized = true;
        return server;
      });
      this.server.catch((error) => {
        console.error(`OGC API client server with URL ${this.url} could not be initialized. Error:`, error);
        return undefined;
      });
    }
    return this.server;
  }

  protected abstract getUrl(): string;

  protected abstract loadDescribeServer(): Promise<Server>;

  /**
   * Load the list of conformance classes, which describe what kind of functionality the server provides.
   */
  public async loadConformance(): Promise<string[]> {
    const response = await fetch(`${this.url}/conformance?f=json`, this.getFetchOptions());
    if (!response?.ok) {
      throw new Error(`Failed to get conformance: ${response?.status} - ${response?.statusText}`);
    }
    const conformance = await response.json();
    return conformance.conformsTo ?? [];
  }

  /**
   * Fetches and retrieves links from the specified path or URL and returns them in a sanitized format.
   */
  public async getLinks(path: string | URL): Promise<OgcApiLinksResponse[]> {
    const response = await fetch(path, this.getFetchOptions());
    if (!response.ok) {
      throw new Error(`Failed to get links: ${response.status} - ${response.statusText}`);
    }
    const jsonResponse = await response.json();
    return this.sanitizeLinks(path, jsonResponse.links);
  }

  /**
   * Retrieves a specific link from the OGC API resource based on the given relation and encoding type.
   */
  public async getLink(
    relation: string,
    path: string | URL = this.url,
    encodingType: string = OgcApiDefaultEncoding
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

  /**
   * Fetches all paginated resources from the specified URL until the entire dataset is retrieved.
   * `dataListName` is the attribute name that holds the list of data items in the response JSON.
   * For feature items, the attribute name is 'features', for collections, it's 'collections'.
   */
  public async fetchAll(url: string | URL, dataListName: string, fetchOptions: RequestInit): Promise<any[]> {
    const responses = [];
    let featureCount = 0;

    while (url) {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`Failed to fetch all: ${response.status} - ${response.statusText}`);
      }

      const responseJson = await response.json();
      responses.push(responseJson);

      // Check if a request limit has been reached
      const limit = new URL(url).searchParams.get('limit');
      featureCount += responseJson[dataListName]?.length ?? 0;
      if (limit && featureCount >= Number(limit)) {
        url = '';
      } else {
        // Get next page URL if it exists
        const links = this.sanitizeLinks(url, responseJson.links);
        url = links?.find((link: OgcApiLinksResponse) => link.rel === 'next')?.href ?? '';
      }
    }
    return responses;
  }

  protected getFetchOptions(method: HttpMethod = 'GET'): RequestInit {
    const fetchOptions: RequestInit = {
      method: method
    };
    fetchOptions.headers = new Headers();
    return fetchOptions;
  }

  /**
   * Sanitizes a list of links by ensuring that their URLs are consistent with the original request URL.
   * Sanitizes if the original URL does not match the link in the `self` href.
   * Limitation: Only works if the original URL and the faulty link share at least one common URL path element, e.g.:
   * '/api/' in (original) https://example.com/api/ and (faulty) https://12345-example.com:8080/mapserv_proxy/api/
   *
   * @param {string} originalPath - The URL of the original request.
   * @param {OgcApiLinksResponse[] | undefined} links - The array of links to sanitize.
   * @return {OgcApiLinksResponse[]} The sanitized list of links.
   */
  protected sanitizeLinks(originalPath: string | URL, links: OgcApiLinksResponse[] | undefined): OgcApiLinksResponse[] {
    if (!links || links.length === 0) {
      return [];
    }
    const selfPath = links.find((link: { rel: string }) => link.rel === 'self')?.href;
    if (!selfPath) {
      console.warn('OGC API client: Cannot sanitize links, list does not contain the `self` relation');
      return links;
    }
    if (!this.areIdenticalUrls(originalPath, selfPath)) {
      const origUrlAsStr = originalPath.toString();
      links = links.map((link: OgcApiLinksResponse) => {
        const commonPath = this.findFirstCommonPath(originalPath, link.href);
        if (commonPath) {
          const baseUrl = origUrlAsStr.slice(0, origUrlAsStr.indexOf(commonPath));
          const pathAndParams = link.href.slice(link.href.indexOf(commonPath));
          link.href = baseUrl + pathAndParams;
        }
        return link;
      });
    }
    return links;
  }

  /**
   * Compares two URLs to determine if they are identical, ignoring URL parameters.
   */
  private areIdenticalUrls(url1: string | URL, url2: string | URL): boolean {
    url1 = typeof url1 === 'string' ? new URL(url1) : url1;
    url2 = typeof url2 === 'string' ? new URL(url2) : url2;
    return url1.host === url2.host && url1.pathname === url2.pathname;
  }

  /**
   * Finds the first common path segment between two given URLs.
   */
  private findFirstCommonPath(url1: string | URL, url2: string | URL): string | null {
    url1 = typeof url1 === 'string' ? new URL(url1) : url1;
    url2 = typeof url2 === 'string' ? new URL(url2) : url2;
    const path1 = url1.pathname.split('/').filter(Boolean);
    const path2 = url2.pathname.split('/').filter(Boolean);
    const commonPath = path1.find((segment) => path2.includes(segment));
    return commonPath || null;
  }
}
