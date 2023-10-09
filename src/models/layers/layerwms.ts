import Layer from './layer';

class LayerWms extends Layer {

  // Base WMS attributes
  public serverName: string;
  public url: string;
  public urlWfs: string | null;
  public imageType: string | null;
  public minResolution: number | null;
  public maxResolution: number | null;
  public layers: string | null = null;

  // Legend attributes
  public legend: string | null;
  public iconUrl: string | null;
  public legendRule: string | null;
  public legendImage: string | null;
  public isLegendExpanded: boolean;
  public wasLegendExpanded: boolean;

  // If the layer is queryable
  public queryable = false;
  public queryLayers: string | null = null;

  constructor(elem: any, serverName: string, url: string, urlWfs: string | null, order: number) {
    super(elem, order);
    this.serverName = serverName;
    this.url = url;
    this.urlWfs = urlWfs;
    this.imageType = elem.imageType;
    this.minResolution = elem.minResolutionHint;
    this.maxResolution = elem.maxResolutionHint;

    this.legend = elem.metadata.legend;
    this.iconUrl = elem.metadata.iconUrl
    this.legendRule = elem.metadata.legendRule;
    this.legendImage = elem.metadata.legendImage;
    this.isLegendExpanded = elem.metadata.isLegendExpanded ?? false;
    this.wasLegendExpanded = this.isLegendExpanded;

    if (elem.childLayers) {
      this.layers = elem.layers;
      // TODO REG: Is it possible that 1 childlayer is queryable, and another one not ?
      if (elem.childLayers.length === 0) {
        // We are on a WMS Layer, but it doesn't have any childlayer.
        // This is probably a configuration error in the backend
        console.warn(`WMS Layer ${elem.name} has no defined child-layer`);
      }
      else {
        this.queryable = elem.childLayers[0].queryable;
        this.queryLayers = (this.queryable) ? elem.childLayers.map((l: any) => l.name).join(',') : '';
      }
    }
  }

  hasRestrictedResolution() {
    return ((this.minResolution && this.minResolution !== 0) 
         || (this.maxResolution && this.maxResolution !== 999999999));
  }

  get serverUniqueQueryId() {
    if (this.serverName) {
      return this.serverName + this.imageType;
    }
    return null
  }
}

export default LayerWms;
