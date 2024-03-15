import { GMFTreeItem } from '../gmf';
import Layer from './layer';
import TileLayer from 'ol/layer/Tile';
import WMTS from 'ol/source/WMTS';

class LayerWmts extends Layer {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public url: string;
  public layers: string;
  public dimensions: Record<string, object> | null;
  public imageType?: string;
  public style?: string;
  public ogcServer?: string;
  // From metadata
  public wmsLayers?: string;
  public printLayers?: string;
  public minResolution?: number;
  public maxResolution?: number;
  public legendImage?: string;
  public hiDPILegendImages?: Record<string, string>;

  /** Linked ol layer, starting with an underscore to not be part of the proxy. **/
  public _olayer?: TileLayer<WMTS>;

  constructor(elem: GMFTreeItem, order: number) {
    if (!elem.url || !elem.layer) {
      throw new Error('No URL or layer defined for WMTS layer ' + elem.name);
    }

    super(elem, order);
    this.url = elem.url;
    this.layers = elem.layer;
    this.dimensions = elem.dimensions ?? null;
    this.imageType = elem.imageType;
    this.style = elem.style;
    this.ogcServer = elem.metadata.ogcServer;
    this.wmsLayers = elem.metadata.wmsLayers;
    this.printLayers = elem.metadata.printLayers;
    this.minResolution = elem.minResolutionHint;
    this.maxResolution = elem.maxResolutionHint;
    this.legendImage = elem.metadata.legendImage;
    this.hiDPILegendImages = elem.metadata.hiDPILegendImages;
  }

  get layerUniqueId() {
    if (this.dimensions !== null) {
      return this.layers + JSON.stringify(this.dimensions);
    }
    return this.name;
  }
}

export default LayerWmts;
