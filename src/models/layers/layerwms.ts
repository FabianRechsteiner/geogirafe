import Layer from './layer';

class LayerWms extends Layer {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside, 
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

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
  public filter: string | null = null;

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

        if (this.queryable) {
          if (!this.queryLayers || this.queryLayers.length == 0) {
            this.hasError = true;
            this.errorMessage = "This layer is defined as queryable but no layer to query has been defined.";
            this.queryable = false;
          }
          if (!this.urlWfs || this.urlWfs.length == 0) {
            this.hasError = true;
            this.errorMessage = "This layer is defined as queryable but no Url for Wfs has been defined.";
            this.queryable = false;
          }
        }
      }
    }
  }

  hasRestrictedResolution() {
    return ((this.minResolution && this.minResolution !== 0) 
         || (this.maxResolution && this.maxResolution !== 999999999));
  }

  get hasFilter() {
    return this.filter !== null && this.filter !== undefined && this.filter !== '';
  }

  get serverUniqueQueryId() {
    return this.serverName + this.imageType;
  }
}

export default LayerWms;
