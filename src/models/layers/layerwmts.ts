// SPDX-License-Identifier: Apache-2.0
import { BrainIgnore } from '../../tools/state/brain/decorators';
import { GMFTreeItem } from '../gmf';
import ServerOgc from '../serverogc';
import ILayerWithLegend from './ilayerwithlegend';
import Layer from './layer';
import TileLayer from 'ol/layer/Tile';
import WMTS from 'ol/source/WMTS';

export type LayerWmtsOptions = {
  isDefaultChecked?: boolean;
  disclaimer?: string;
  metadataUrl?: string;
  opacity?: number;
  restricted?: boolean;
  dimensions?: Record<string, object>;
  imageType?: string;
  style?: string;
  wmsLayers?: string;
  queryLayers?: string;
  ogcServer?: string;
  printLayers?: string;
  minResolution?: number;
  maxResolution?: number;
  legend?: boolean;
  legendImage?: string;
  isLegendExpanded?: boolean;
  wasLegendExpanded?: boolean;
  hiDPILegendImages?: Record<string, string>;
};

class LayerWmts extends Layer implements ILayerWithLegend {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public url: string;
  public layer: string;
  public dimensions?: Record<string, object>;
  public imageType?: string;
  public style?: string;
  public minResolution?: number;
  public maxResolution?: number;
  public legend: boolean;
  public legendImage?: string;
  public override isLegendExpanded: boolean;
  public wasLegendExpanded: boolean;

  // A WMTS layer can have WMS informations to be able to query infos and print with a WMS layer.
  // TODO REG : Shouldn't we link here directly an object of type LayerWMS ?
  @BrainIgnore
  public ogcServer?: ServerOgc;

  public wmsLayers?: string;
  public queryLayers?: string;
  public printLayers?: string;
  public hiDPILegendImages?: Record<string, string>;

  /** Linked ol layer, starting with an underscore to not be part of the proxy. **/
  public _olayer?: TileLayer<WMTS>;

  public constructor(
    id: number,
    name: string,
    order: number,
    url: string,
    layer: string,
    options?: GMFTreeItem | LayerWmtsOptions,
    ogcServer?: ServerOgc
  ) {
    let opts = options ?? {};
    opts = LayerWmts.isGMFTreeItem(opts) ? LayerWmts.getOptionsFromGMFTreeItem(opts) : opts;
    super(id, name, order, opts);
    this.url = url;
    this.layer = layer;
    this.ogcServer = ogcServer;
    this.dimensions = opts.dimensions;
    this.imageType = opts.imageType;
    this.style = opts.style;
    this.wmsLayers = opts.wmsLayers;
    this.queryLayers = opts.queryLayers;
    this.printLayers = opts.printLayers;
    this.minResolution = opts.minResolution;
    this.maxResolution = opts.maxResolution;
    this.legend = opts.legend ?? false;
    this.legendImage = opts.legendImage;
    this.isLegendExpanded = opts?.isLegendExpanded ?? false;
    this.wasLegendExpanded = opts?.wasLegendExpanded ?? !this.isLegendExpanded;
    this.hiDPILegendImages = opts.hiDPILegendImages;
  }

  public clone(): LayerWmts {
    const options = {
      isDefaultChecked: this.isDefaultChecked,
      metadataUrl: this.metadataUrl,
      disclaimer: this.disclaimer,
      opacity: this.opacity,
      restricted: this.restricted,
      dimensions: this.dimensions,
      imageType: this.imageType,
      style: this.style,
      queryLayers: this.queryLayers,
      wmsLayers: this.wmsLayers,
      printLayers: this.printLayers,
      minResolution: this.minResolution,
      maxResolution: this.maxResolution,
      legend: this.legend,
      legendImage: this.legendImage,
      isLegendExpanded: this.isLegendExpanded,
      wasLegendExpanded: this.wasLegendExpanded,
      hiDPILegendImages: this.hiDPILegendImages
    };
    const clonedObject = new LayerWmts(this.id, this.name, this.order, this.url, this.layer, options, this.ogcServer);
    clonedObject.activeState = this.activeState;
    return clonedObject;
  }

  public get layerUniqueId() {
    if (this.dimensions) {
      return this.layer + JSON.stringify(this.dimensions);
    }
    return this.name;
  }

  public hasRestrictedResolution() {
    return (this.minResolution && this.minResolution !== 0) || (this.maxResolution && this.maxResolution !== 999999999);
  }

  public isVisibleAtResolution(resolution: number) {
    if (resolution === undefined || resolution === null || !this.hasRestrictedResolution()) {
      return true;
    }
    return resolution >= (this.minResolution ?? -1) && resolution <= (this.maxResolution ?? Infinity);
  }

  private static isGMFTreeItem(options: GMFTreeItem | LayerWmtsOptions): options is GMFTreeItem {
    return 'id' in options;
  }

  private static getOptionsFromGMFTreeItem(options: GMFTreeItem): LayerWmtsOptions {
    return {
      isDefaultChecked: options.metadata?.isChecked,
      metadataUrl: options.metadata?.metadataUrl,
      disclaimer: options.metadata?.disclaimer,
      opacity: options.metadata?.opacity,
      restricted: options.public === undefined ? (options.metadata?.protected ?? false) : !options.public,
      dimensions: options.dimensions,
      imageType: options.imageType,
      style: options.style,
      wmsLayers: options.metadata?.wmsLayers,
      ogcServer: options.metadata?.ogcServer,
      queryLayers: options.metadata?.queryLayers,
      printLayers: options.metadata?.printLayers,
      minResolution: options.minResolutionHint,
      maxResolution: options.maxResolutionHint,
      legend: options.metadata?.legend,
      legendImage: options.metadata?.legendImage,
      isLegendExpanded: options.metadata?.isLegendExpanded,
      wasLegendExpanded: options.metadata?.wasLegendExpanded,
      hiDPILegendImages: options.metadata?.hiDPILegendImages
    };
  }
}

export default LayerWmts;
