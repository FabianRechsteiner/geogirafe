import { GMFTreeItem } from '../gmf';
import ServerOgc from '../serverogc';
import Layer from './layer';
import TileLayer from 'ol/layer/Tile';
import WMTS from 'ol/source/WMTS';

export type LayerWmtsOptions = {
  isDefaultChecked?: boolean;
  disclaimer?: string;
  opacity?: number;
  dimensions?: Record<string, object>;
  imageType?: string;
  style?: string;
  wmsLayers?: string;
  printLayers?: string;
  minResolution?: number;
  maxResolution?: number;
  legendImage?: string;
  hiDPILegendImages?: Record<string, string>;
};

class LayerWmts extends Layer {
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
  public legendImage?: string;

  // A WMTS layer can have WMS informations to be able to query infos and print with a WMS layer.
  // TODO REG : Shouldn't we link here directly an object of type LayerWMS ?
  public ogcServer?: ServerOgc;
  public wmsLayers?: string;
  public printLayers?: string;
  public hiDPILegendImages?: Record<string, string>;

  /** Linked ol layer, starting with an underscore to not be part of the proxy. **/
  public _olayer?: TileLayer<WMTS>;

  constructor(
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
    this.printLayers = opts.printLayers;
    this.minResolution = opts.minResolution;
    this.maxResolution = opts.maxResolution;
    this.legendImage = opts.legendImage;
    this.hiDPILegendImages = opts.hiDPILegendImages;
  }

  clone(): LayerWmts {
    const options = {
      isDefaultChecked: this.isDefaultChecked,
      disclaimer: this.disclaimer,
      opacity: this.opacity,
      dimensions: this.dimensions,
      imageType: this.imageType,
      style: this.style,
      ogcServer: this.ogcServer,
      wmsLayers: this.wmsLayers,
      printLayers: this.printLayers,
      minResolution: this.minResolution,
      maxResolution: this.maxResolution,
      legendImage: this.legendImage,
      hiDPILegendImages: this.hiDPILegendImages
    };
    const clonedObject = new LayerWmts(this.id, this.name, this.order, this.url, this.layer, options);
    clonedObject.activeState = this.activeState;
    return clonedObject;
  }

  get layerUniqueId() {
    if (this.dimensions) {
      return this.layer + JSON.stringify(this.dimensions);
    }
    return this.name;
  }

  private static isGMFTreeItem(options: GMFTreeItem | LayerWmtsOptions): options is GMFTreeItem {
    return 'id' in options;
  }

  private static getOptionsFromGMFTreeItem(options: GMFTreeItem): LayerWmtsOptions {
    return {
      isDefaultChecked: options.metadata?.isChecked,
      disclaimer: options.metadata?.disclaimer,
      opacity: 1, // TODO REG : Set default opacity
      dimensions: options.dimensions,
      imageType: options.imageType,
      style: options.style,
      wmsLayers: options.metadata?.wmsLayers,
      printLayers: options.metadata?.printLayers,
      minResolution: options.minResolutionHint,
      maxResolution: options.maxResolutionHint,
      legendImage: options.metadata?.legendImage,
      hiDPILegendImages: options.metadata?.hiDPILegendImages
    };
  }
}

export default LayerWmts;
