import { appendParams } from 'ol/uri';
import TileLayer from 'ol/layer/Tile';
import WMTS from 'ol/source/WMTS';

class LegendHelper {
  /**
   * Get the WMS legend URL.
   * @param url The base url of the wms service.
   * @param layerName The name of a wms layer.
   * @param options to create the legend url.
   * @returns The legend URL or undefined.
   */
  static readonly getWMSLegendURL = (
    url: string | undefined,
    layerName: string,
    options?: WMSLegendURLOptions
  ): string | undefined => {
    if (!url) {
      return undefined;
    }
    const queryString: Record<string, unknown> = {
      FORMAT: 'image/png',
      TRANSPARENT: true,
      SERVICE: 'WMS',
      VERSION: '1.1.1',
      REQUEST: 'GetLegendGraphic',
      LAYER: layerName
    };
    const scale = options?.scale;
    const legendRule = options?.legendRule;
    const legendWidth = options?.legendWidth;
    const legendHeight = options?.legendHeight;
    const serverType = options?.serverType;
    const dpi = options?.dpi;
    const bbox = options?.bbox;
    const srs = options?.srs;
    const additionalQueryString = options?.additionalQueryString;
    if (scale !== undefined) {
      queryString.SCALE = scale;
    }
    if (legendRule !== undefined) {
      queryString.RULE = legendRule;
      if (legendWidth !== undefined) {
        queryString.WIDTH = legendWidth;
      }
      if (legendHeight !== undefined) {
        queryString.HEIGHT = legendHeight;
      }
    }
    if (serverType == 'qgis') {
      if (dpi != undefined) {
        queryString.DPI = dpi;
      }
      if (bbox != undefined && srs != undefined && scale != undefined && dpi != undefined && legendRule == undefined) {
        queryString.BBOX = bbox.join(',');
        queryString.SRS = srs;
        queryString.SRCWIDTH = Math.round(((bbox[2] - bbox[0]) / scale) * 39.37 * dpi);
        queryString.SRCHEIGHT = Math.round(((bbox[3] - bbox[1]) / scale) * 39.37 * dpi);
        delete queryString.SCALE; // QGIS calculate it from the BBOX the SRCWIDTH and the SRCHEIGHT.
      }
    }
    if (additionalQueryString) {
      Object.assign(queryString, additionalQueryString);
    }
    return appendParams(url, queryString);
  };

  /**
   * Retrieves the legend URL for a given WMTS tile layer.
   * @param {TileLayer<WMTS>} olayer - The OpenLayers tile layer object.
   * @returns The legend URL or undefined if not found.
   */
  static readonly getWMTSLegendURL = (olayer: TileLayer<WMTS>): string | undefined => {
    // BGE case of multiple styles ? case of multiple legendUrl ?
    const styles = olayer.get('capabilitiesStyles');
    if (!Array.isArray(styles) || styles.length <= 0) {
      return;
    }
    const legendURL = styles[0].LegendURL;
    if (!Array.isArray(legendURL) || legendURL.length <= 0) {
      return;
    }
    return legendURL[0].href;
  };
}

/**
 * Options to get WMS legend URL.
 * @property legendRule parameters to add to the returned URL.
 * @property legendWidth the legend width.
 * @property legendHeight the legend height.
 * @property serverType the OpenLayers server type.
 * @property dpi the DPI.
 * @property bbox the bbox.
 * @property srs The projection code.
 * @property additionalQueryString Additional query string parameters.
 */
export interface WMSLegendURLOptions {
  scale?: number;
  legendRule?: string;
  legendWidth?: number;
  legendHeight?: number;
  serverType?: string;
  dpi?: number;
  bbox?: number[];
  srs?: string;
  additionalQueryString?: Record<string, unknown>;
}

export default LegendHelper;
