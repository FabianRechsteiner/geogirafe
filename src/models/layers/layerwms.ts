import WfsFilter from '../../tools/wfs/wfsfilter';
import { GMFChildLayer, GMFTreeItem } from '../gmf';
import ServerOgc from '../serverogc';
import ILayerWithFilter from './ilayerwithfilter';
import ILayerWithLegend from './ilayerwithlegend';
import ILayerWithTime from './ilayerwithtime';
import ITimeOptions from '../../tools/time/itimeoptions';
import LayerTimeFormatter from '../../tools/time/layertimeformatter';
import Layer from './layer';

export type LayerWmsOptions = {
  isDefaultChecked?: boolean;
  disclaimer?: string;
  metadataUrl?: string;
  opacity?: number;
  protected?: boolean;
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
  time?: ITimeOptions;
  timeAttribute?: string;
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
  public filter?: WfsFilter;

  public timeOptions?: ITimeOptions;
  public timeRestriction?: string;
  public timeAttribute?: string;

  constructor(id: number, name: string, order: number, ogcServer: ServerOgc, options?: GMFTreeItem | LayerWmsOptions) {
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
    this.timeOptions = opts?.time;
    this.timeAttribute = opts?.timeAttribute;

    if (this.queryable && (!this.ogcServer.wfsSupport || this.ogcServer.urlWfs?.length === 0)) {
      this.hasError = true;
      this.errorMessage = 'This layer is defined as queryable but no Url for Wfs has been defined.';
      this.queryable = false;
    }
    this.setDefaultTimeRestriction();
  }

  clone(): LayerWms {
    const options: LayerWmsOptions = {
      isDefaultChecked: this.isDefaultChecked,
      metadataUrl: this.metadataUrl,
      disclaimer: this.disclaimer,
      opacity: this.opacity,
      protected: this.protected,
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
      time: this.timeOptions,
      timeAttribute: this.timeAttribute
    };

    const clonedObject = new LayerWms(this.id, this.name, this.order, this.ogcServer, options);
    clonedObject.filter = this.filter;
    clonedObject.activeState = this.activeState;
    clonedObject.timeRestriction = this.timeRestriction;
    return clonedObject;
  }

  hasRestrictedResolution() {
    return (this.minResolution && this.minResolution !== 0) || (this.maxResolution && this.maxResolution !== 999999999);
  }

  isVisibleAtResolution(resolution: number) {
    if (resolution === undefined || resolution === null || !this.hasRestrictedResolution()) {
      return true;
    }
    return resolution >= (this.minResolution ?? -1) && resolution <= (this.maxResolution ?? Infinity);
  }

  get hasFilter() {
    return this.filter !== null && this.filter !== undefined;
  }

  get hasTimeRestriction() {
    return !!this.timeRestriction;
  }

  setDefaultTimeRestriction() {
    if (this.timeOptions) {
      const timeFormatter = new LayerTimeFormatter(this.timeOptions);
      this.timeRestriction = timeFormatter.getFormattedDefault();
    }
  }

  get serverUniqueQueryId() {
    return this.ogcServer.uniqueWmsQueryId;
  }

  get wfsQueryable() {
    return this.queryable && Boolean(this.ogcServer?.urlWfs && this.queryLayers);
  }

  private static isGMFTreeItem(options: GMFTreeItem | LayerWmsOptions): options is GMFTreeItem {
    return 'id' in options;
  }

  private static getOptionsFromGMFTreeItem(options: GMFTreeItem): LayerWmsOptions {
    const opts: LayerWmsOptions = {
      isDefaultChecked: options.metadata?.isChecked,
      metadataUrl: options.metadata?.metadataUrl,
      disclaimer: options.metadata?.disclaimer,
      opacity: 1, // TODO REG : Set default opacity
      protected: options.metadata?.protected,
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
      timeAttribute: options.metadata?.timeAttribute
    };

    if (options.childLayers) {
      opts.queryLayers = options.childLayers
        .filter((l: GMFChildLayer) => l.queryable)
        .map((l: GMFChildLayer) => l.name)
        .join(',');
      opts.queryable = opts.queryLayers.length > 0;
    }

    return opts;
  }
}

export default LayerWms;
