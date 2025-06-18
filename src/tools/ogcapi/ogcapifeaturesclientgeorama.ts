import OgcApiFeaturesClient, { DEMO_INSTANCES, OgcApiFeaturesClientOptions } from './ogcapifeaturesclient';
import { HttpMethod } from './ogcapiclient';

export default class OgcApiFeaturesClientGeorama extends OgcApiFeaturesClient {
  constructor(options: OgcApiFeaturesClientOptions) {
    super(options);
  }

  /*
  Overwrite base method fetch options because the Georama demo server currently only supports basic auth.
   */
  protected getFetchOptions(method: HttpMethod = 'GET'): RequestInit {
    const fetchOptions = super.getFetchOptions(method);
    const headers = new Headers(fetchOptions?.headers);
    // POC: Only basic auth for now
    headers.set('Authorization', `Basic ${window.btoa(DEMO_INSTANCES.GEORAMA.credentials)}`);
    fetchOptions.credentials = 'include';
    fetchOptions.mode = 'cors';
    fetchOptions.headers = headers;
    return fetchOptions;
  }
}
