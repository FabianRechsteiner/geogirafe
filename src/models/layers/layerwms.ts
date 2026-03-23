// SPDX-License-Identifier: Apache-2.0
import WfsFilter from '../../tools/wfs/wfsfilter';
import { GMFChildLayer, GMFTreeItem } from '../gmf';
import ServerOgc from '../serverogc';
import ILayerWithFilter from './ilayerwithfilter';
import ILayerWithLegend from './ilayerwithlegend';
import ILayerWithTime from './ilayerwithtime';
import ITimeOptions from '../../tools/time/itimeoptions';
import ISnappingConfig from '../../tools/snap/isnapconfig';
import LayerTimeFormatter from '../../tools/time/layertimeformatter';
import Layer from './layer';
import { BrainIgnore } from '../../tools/state/brain/decorators';

export type LayerWmsOptions = {
  isDefaultChecked?: boolean;
  disclaimer?: string;
  metadataUrl?: string;
  opacity?: number;
  restricted?: boolean;
  minResolution?: number;
  maxResolution?: number;
  layers?: string;
  style?: string;
  legend?: boolean;
  iconUrl?: string;
  legendRule?: string;
  legendImage?: string;
  isLegendExpanded?: boolean;
  wasLegendExpanded?: boolean;
  hiDPILegendImages?: Record<string, string>;
  printNativeAngle?: boolean;
  queryable?: boolean;
  queryLayers?: string;
  queryLayersRanges?: { [name: string]: { minResolution?: number; maxResolution?: number } };
  time?: ITimeOptions;
  snappingConfig?: ISnappingConfig;
  timeAttribute?: string;
  editable?: string;
};

class LayerWms extends Layer implements ILayerWithLegend, ILayerWithFilter, ILayerWithTime {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  // Base WMS attributes
  @BrainIgnore
  public ogcServer: ServerOgc;

  public minResolution?: number;
  public maxResolution?: number;
  public layers?: string;
  public style?: string;

  // Legend attributes
  public legend: boolean;
  public iconUrl?: string;
  public legendRule?: string;
  public legendImage?: string;
  public isLegendExpanded: boolean;
  public wasLegendExpanded: boolean;
  public hiDPILegendImages?: Record<string, string>;
  public printNativeAngle?: boolean; // TODO BGE Is it correct to have it at this level (should be for groups) ?

  // If the layer is queryable
  public queryable: boolean = false;
  public queryLayers?: string;
  public queryLayersRanges: { [name: string]: { minResolution?: number; maxResolution?: number } };
  public filter?: WfsFilter;

  public timeOptions?: ITimeOptions;
  public snapOptions?: ISnappingConfig;
  public snapActive: boolean;
  public timeRestriction?: string;
  public timeAttribute?: string;

  public editable?: string;

  public constructor(
    id: number,
    name: string,
    order: number,
    ogcServer: ServerOgc,
    options?: GMFTreeItem | LayerWmsOptions
  ) {
    let opts = options ?? {};
    opts = LayerWms.isGMFTreeItem(opts) ? LayerWms.getOptionsFromGMFTreeItem(opts) : opts;
    super(id, name, order, opts);
    this.ogcServer = ogcServer;

    this.minResolution = opts?.minResolution;
    this.maxResolution = opts?.maxResolution;
    this.layers = opts?.layers;
    this.style = opts?.style;
    this.legend = opts?.legend ?? false;
    this.iconUrl = opts?.iconUrl;
    this.legendRule = opts?.legendRule;
    this.legendImage = opts?.legendImage;
    this.isLegendExpanded = opts?.isLegendExpanded ?? false;
    this.wasLegendExpanded = opts?.wasLegendExpanded ?? this.isLegendExpanded;
    this.hiDPILegendImages = opts?.hiDPILegendImages;
    this.printNativeAngle = opts?.printNativeAngle;
    this.queryable = opts?.queryable ?? false;
    this.queryLayers = opts?.queryLayers;
    this.queryLayersRanges = opts?.queryLayersRanges || {};
    this.timeOptions = opts?.time;
    this.timeAttribute = opts?.timeAttribute;
    this.editable = opts?.editable;
    this.snapOptions = opts?.snappingConfig;
    this.snapActive = this.snapOptions !== undefined;

    if (this.editable && (!this.ogcServer.oapifSupport || this.ogcServer.urlOapif?.length === 0)) {
      this.hasError = true;
      this.errorMessage = 'This layer is defined as editable but no Url for OgcApiFeatures service has been defined.';
      this.editable = undefined;
    }
    this.setDefaultTimeRestriction();
  }

  public clone(): LayerWms {
    const options: LayerWmsOptions = {
      isDefaultChecked: this.isDefaultChecked,
      metadataUrl: this.metadataUrl,
      disclaimer: this.disclaimer,
      opacity: this.opacity,
      restricted: this.restricted,
      minResolution: this.minResolution,
      maxResolution: this.maxResolution,
      layers: this.layers,
      style: this.style,
      legend: this.legend,
      iconUrl: this.iconUrl,
      legendRule: this.legendRule,
      legendImage: this.legendImage,
      isLegendExpanded: this.isLegendExpanded,
      wasLegendExpanded: this.wasLegendExpanded,
      hiDPILegendImages: this.hiDPILegendImages,
      printNativeAngle: this.printNativeAngle,
      queryable: this.queryable,
      queryLayers: this.queryLayers,
      queryLayersRanges: this.queryLayersRanges,
      time: this.timeOptions,
      snappingConfig: this.snapOptions,
      timeAttribute: this.timeAttribute,
      editable: this.editable
    };

    const clonedObject = new LayerWms(this.id, this.name, this.order, this.ogcServer, options);
    clonedObject.filter = this.filter;
    clonedObject.activeState = this.activeState;
    clonedObject.timeRestriction = this.timeRestriction;
    return clonedObject;
  }

  public static isResolutionRangeRestricted(minResolution: number | undefined, maxResolution: number | undefined) {
    return (minResolution && minResolution !== 0) || (maxResolution && maxResolution !== 999999999);
  }

  public hasRestrictedResolution() {
    return LayerWms.isResolutionRangeRestricted(this.minResolution, this.maxResolution);
  }

  public static isInVisibleRange(
    resolution: number,
    minResolution: number | undefined,
    maxResolution: number | undefined
  ) {
    if (
      resolution === undefined ||
      resolution === null ||
      !LayerWms.isResolutionRangeRestricted(minResolution, maxResolution)
    ) {
      return true;
    }
    return resolution >= (minResolution ?? -1) && resolution <= (maxResolution ?? Infinity);
  }

  public isVisibleAtResolution(resolution: number) {
    return LayerWms.isInVisibleRange(resolution, this.minResolution, this.maxResolution);
  }

  public get hasFilter() {
    return this.filter !== null && this.filter !== undefined;
  }

  public get hasTimeRestriction() {
    return !!this.timeRestriction;
  }

  public setDefaultTimeRestriction() {
    if (this.timeOptions) {
      const timeFormatter = new LayerTimeFormatter(this.timeOptions);
      this.timeRestriction = timeFormatter.getFormattedDefault();
    }
  }

  public get serverUniqueQueryId() {
    return this.ogcServer.uniqueWmsQueryId;
  }

  public get wfsQueryable(): boolean {
    return (
      this.queryable &&
      this.ogcServer.wfsSupport &&
      this.ogcServer.urlWfs !== undefined &&
      this.queryLayers !== undefined
    );
  }

  public get wmsQueryableOnly(): boolean {
    return this.queryable && !this.ogcServer.wfsSupport;
  }

  private static isGMFTreeItem(options: GMFTreeItem | LayerWmsOptions): options is GMFTreeItem {
    return 'id' in options;
  }

  private static getOptionsFromGMFTreeItem(options: GMFTreeItem): LayerWmsOptions {
    const opts: LayerWmsOptions = {
      isDefaultChecked: options.metadata?.isChecked,
      metadataUrl: options.metadata?.metadataUrl,
      disclaimer: options.metadata?.disclaimer,
      opacity: options.metadata?.opacity,
      restricted: options.public === undefined ? (options.metadata?.protected ?? false) : !options.public,
      minResolution: options.minResolutionHint,
      maxResolution: options.maxResolutionHint,
      layers: options.layers,
      style: options.style,
      legend: options.metadata?.legend,
      iconUrl: options.metadata?.iconUrl,
      legendRule: options.metadata?.legendRule,
      legendImage: options.metadata?.legendImage,
      isLegendExpanded: options.metadata?.isLegendExpanded,
      wasLegendExpanded: options.metadata?.wasLegendExpanded,
      printNativeAngle: options.metadata?.printNativeAngle,
      hiDPILegendImages: options.metadata?.hiDPILegendImages,
      time: options.time,
      snappingConfig: options.metadata?.snappingConfig,
      timeAttribute: options.metadata?.timeAttribute
    };

    if (options.childLayers) {
      opts.queryLayers = options.childLayers
        .filter((l: GMFChildLayer) => l.queryable)
        .map((l: GMFChildLayer) => l.name)
        .join(',');
      opts.queryLayersRanges = {};
      options.childLayers.forEach((l: GMFChildLayer) => {
        if (!l.queryable) {
          return;
        }
        if (
          (l.minResolutionHint && l.minResolutionHint !== 0) ||
          (l.maxResolutionHint && l.maxResolutionHint !== 999999999)
        ) {
          opts.queryLayersRanges![l.name] = {
            minResolution: l.minResolutionHint,
            maxResolution: l.maxResolutionHint
          };
        }
      });
      opts.queryable = opts.queryLayers.length > 0;
    }

    return opts;
  }
}

export default LayerWms;
