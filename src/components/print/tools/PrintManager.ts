import type { MFPSpec, MFPReportResponse, MFPCancelResponse } from '@geoblocks/mapfishprint';
import type { MFPAttributes } from '@geoblocks/mapfishprint/src/types';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type { EncodeLegendOptions, MFPLegendClass } from './MFPLegendEncoder';
import type State from '../../../tools/state/state';
import type I18nManager from '../../../tools/i18n/i18nmanager';
import type MapManager from '../../../tools/state/mapManager';
import type { MFPPrintDatasource } from './MFPTypes';

import {
  BaseCustomizer,
  requestReport as requestReportMFP,
  getDownloadUrl as getDownloadUrlMFP,
  cancelPrint as cancelPrintMFP,
  getPrintExtent as getPrintExtentMFP
} from '@geoblocks/mapfishprint';
import { MFPLegendEncoder } from './MFPLegendEncoder';
import MFPEncoder from './MFPEncoder';
import { deleteFeatureOlParams } from '../../../tools/utils/olutils';
import { intersects } from 'ol/extent';

/**
 * Represents encoding options to print the map.
 */
export interface EncodeOptions {
  mapManager: MapManager;
  i18nManager: I18nManager;
  state: State;
  scale: number;
  printResolution: number;
  dpi: number;
  layout: string;
  format: string;
  pageSize: number[];
  customAttributes: Record<string, unknown>;
}

/**
 * An interface class that manages printing functionality (including legend).
 */
export default class PrintManager {
  protected legendEncoder: MFPLegendEncoder;
  protected encoder: MFPEncoder;
  protected customizer: BaseCustomizer;

  constructor() {
    this.legendEncoder = new MFPLegendEncoder();
    this.encoder = new MFPEncoder();
    this.customizer = new BaseCustomizer();
  }

  /**
   * Requests a print report.
   * @returns A promise that resolves with the response from the report request.
   */
  async requestReport(printUrl: string, spec: MFPSpec): Promise<MFPReportResponse> {
    return requestReportMFP(printUrl, spec);
  }

  /**
   * Cancels a report.
   * @returns A promise that resolves with the cancellation response.
   */
  async cancelReport(printUrl: string, ref: string): Promise<MFPCancelResponse> {
    return cancelPrintMFP(printUrl, ref);
  }

  /**
   * Retrieves the download URL for a given request report.
   * @returns A promise that resolves to the download URL.
   */
  async getDownloadUrl(
    requestReport: string,
    response: MFPReportResponse,
    interval = 1000,
    timeout = 30000
  ): Promise<string> {
    return getDownloadUrlMFP(requestReport, response, interval, timeout);
  }

  /**
   * Introspect the map and convert each of its layers to MFP v3 format.
   * @returns a top level MFP spec
   */
  encode(options: EncodeOptions): MFPSpec | null {
    const center = options.mapManager.getMap().getView().getCenter() || [0, 0];
    this.customizer.setPrintExtent(this.getExtent(options.pageSize, options.scale, center) || [0, 0, 0, 0]);
    const mapSpec = this.encoder.encodeMap({
      state: options.state,
      mapManager: options.mapManager,
      scale: options.scale,
      printResolution: options.mapManager.getMap().getView().getResolution() || 100,
      dpi: options.dpi,
      customizer: this.customizer
    });

    const attributes: MFPAttributes = {
      map: mapSpec
    };
    Object.assign(attributes, options.customAttributes);

    return {
      attributes,
      format: options.format,
      layout: options.layout
    };
  }

  /**
   * Encodes a print legend based on the given options.
   * @returns The encoded legend, or null if encoding is empty or fails.
   */
  encodeLegend(options: EncodeLegendOptions): MFPLegendClass | null {
    const center = options.mapManager.getMap().getView().getCenter() || [0, 0];
    const extent = this.getExtent(options.pageSize, options.scale, center) || [0, 0, 0, 0];
    options.extent = options.extent ?? extent;
    return this.legendEncoder.encodeLegend(options);
  }

  /**
   * Calculates the extent of the paper based on the given scale and center coordinates.
   * @returns The extent of the paper.
   */
  getExtent(pageSize: number[], scale: number, center: number[]) {
    return getPrintExtentMFP(pageSize, center, scale);
  }

  /**
   * Formats the data source for printing, based on selected features filtered by the given extent.
   * @static
   * */
  static getPrintDatasourceFromSelectedFeatures(
    selectedFeatures: Feature<Geometry>[],
    extent: number[],
    i18nManager: I18nManager
  ): MFPPrintDatasource[] {
    return (
      selectedFeatures.reduce((datasources, feature) => {
        const featureExtent = feature.getGeometry()?.getExtent() ?? [];
        if (!intersects(featureExtent, extent)) {
          return datasources;
        }
        const id = feature.getId();
        const rawTitle = id === undefined ? 'UNKNOWN' : `${id}`.split('.')[0];
        const title = i18nManager.getTranslation(rawTitle);
        const properties = deleteFeatureOlParams(feature);
        const datasource = datasources.find((datasource) => datasource.title === title);
        const values = Object.values(properties);
        if (datasource) {
          datasource.table.data.push(values);
          return datasources;
        }
        datasources.push({
          title,
          table: {
            data: [values],
            columns: Object.keys(properties).map((column) => i18nManager.getTranslation(column))
          }
        });
        return datasources;
      }, [] as MFPPrintDatasource[]) || []
    );
  }
}
