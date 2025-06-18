import OgcApiFeaturesClient, { OgcApiFeaturesClientOptions } from './ogcapifeaturesclient';
import { HttpMethod } from './ogcapiclient';
import Feature from 'ol/Feature';
import { Geometry, Point } from 'ol/geom';
import { transform } from 'ol/proj';

export default class OgcApiFeaturesClientGmf extends OgcApiFeaturesClient {
  constructor(options: OgcApiFeaturesClientOptions) {
    super(options);
  }

  /**
   * POC overwrite: Client does not accept POSTing features in EPSG:2056, have to transform WGS84.
   */
  public async createItem(collectionId: string, item: Feature<Geometry>): Promise<boolean> {
    const geom = item.getGeometry();
    if (geom instanceof Point && this.state.projection === 'EPSG:2056') {
      const coordinatesWgs84 = transform(geom.getCoordinates(), 'EPSG:2056', 'EPSG:4326');
      item.setGeometry(new Point(coordinatesWgs84));
    }
    return super.createItem(collectionId, item);
  }

  /**
   * POC overwrite: method to fix the next URL
   */
  protected getNextUrl(responseJson: any, currentUrl: string): string {
    const newUrl = super.getNextUrl(responseJson, currentUrl);
    return this.fixWrongNextUrl(currentUrl, newUrl);
  }

  /**
   * POC overwrite: Fixing wrong base URLs.
   * Compares the initial URL with the URL in the links > next section and fixes it if necessary.
   * This happens because QGIS Server currently doesn't know about the base URL of the GMF backend.
   * Example: `http://gmf-2-9-app-qgisserver:8080` instead of
   * `https://geomapfish-demo-2-9.camptocamp.com/mapserv_proxy/QGIS_Server`
   */
  private fixWrongNextUrl(oldUrl: string, nextUrl: string): string {
    const idxOld = oldUrl.indexOf('collections');
    const idxNext = nextUrl.indexOf('collections');
    if (idxOld !== -1 && idxNext !== -1 && idxOld !== idxNext) {
      return oldUrl.slice(0, idxOld) + nextUrl.slice(idxNext);
    } else {
      return nextUrl;
    }
  }

  protected getFetchOptions(method: HttpMethod = 'GET'): RequestInit {
    const fetchOptions = super.getFetchOptions(method);
    fetchOptions.mode = 'cors';
    return fetchOptions;
  }
}
