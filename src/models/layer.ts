class Layer {

  // Base properties
  id: number;
  name: string;
  type: string | null = null;
  isDefaultChecked: boolean | null = null;
  private _isExclusiveGroup = false;

  // Group properties
  isDefaultExpanded: boolean | null = null;

  // For hierarchy management
  children: Layer[] = [];
  parent: Layer | null = null;

  // VectorTiles
  style: any = null;
  projection?: string;
  source?: string;

  // WMS & WMTS
  server: string | null = null;
  url: string | null = null;
  urlWfs: string | null = null;
  imageType: string | null = null;
  layers: string | null = null;
  dimensions: Record<string, {}> = {};
  queryLayers: string | null = null;
  minResolution: number | null = null;
  maxResolution: number | null = null;
  queryable = false;

  // Legend properties
  legend: string | null = null;
  iconUrl: string | null = null;
  legendRule: string | null = null;
  legendImage: string | null = null;
  isLegendExpanded: boolean = false;

  // Layer state
  activeState: 'on' | 'off' | 'semi' = 'off';
  opacity = 1;
  order = 0;

  // Is this layer used as basemap ?
  basemap = false;

  isGroup: boolean = false;
  isLayer: boolean = false;

  isExpanded = false;

  constructor(elem: any, serverName: string | null, url: string | null, urlWfs: string | null, order: number) {
    this.id = elem.id;
    this.name = elem.name;
    this.type = elem.type;
    this.order = order;
    this.isDefaultChecked = (elem.metadata && elem.metadata.isChecked);

    if (elem.type === 'OSM') {
      // Nothing more to do
    }
    else if (elem.type === 'VectorTiles') {
      this.style = elem.style;
      this.projection = elem.projection;
      this.source = elem.source;
      this.isLayer = true;
    }
    else if (elem.type === 'WMTS') {
      this.url = elem.url;
      this.isLayer = true;
      this.layers = elem.layer;
      this.dimensions = elem.dimensions;
    }
    else if (elem.type === 'WMS') {
      this.server = serverName;
      this.url = url;
      this.urlWfs = urlWfs;
      this.imageType = elem.imageType;
      this.minResolution = elem.minResolutionHint;
      this.maxResolution = elem.maxResolutionHint;
      this.iconUrl = elem.metadata.iconUrl
      this.legend = elem.metadata.legend;
      this.legendRule = elem.metadata.legendRule;
      this.isLegendExpanded = (elem.metadata.isLegendExpanded !== undefined) ? elem.metadata.isLegendExpanded : false;
      this.legendImage = elem.metadata.legendImage;

      if (elem.childLayers) {
        // WMS Layer
        this.isLayer = true;
        this.layers = elem.layers;
        // TODO REG: Is it possible that 1 childlayer is queryable, and another one not ?
        if (elem.childLayers.length === 0) {
          // We are on a WMS Layer, but it doesn't have any childlayer.
          // TODO REG : Is this a configuration error in the backend ?
          console.warn(`Layer ${elem.name} has no childlayer`);
        }
        else {
          this.queryable = elem.childLayers[0].queryable;
          this.queryLayers = (this.queryable) ? elem.childLayers.map((l: any) => l.name).join(',') : '';
        }
      }
    }
    else {
      // Other cases: Groups
      this.isGroup = true;
      this.isDefaultExpanded = (elem.metadata && elem.metadata.isExpanded);
      this._isExclusiveGroup = (elem.metadata && elem.metadata.exclusiveGroup);
    }
  }

  hasRestrictedResolution() {
    return ((this.minResolution !== undefined && this.minResolution !== 0) 
         || (this.maxResolution !== undefined && this.maxResolution !== 999999999));
  }

  get legendId() {
    return 'LEG-' + this.id;
  }

  get serverUniqueQueryId() {
    if (this.server) {
      return this.server + this.imageType;
    }
    return null
  }

  get layerUniqueId() {
    if (this.type === 'WMTS' && this.dimensions !== null) {
      return this.layers + JSON.stringify(this.dimensions);
    }
    
    // All other cases
    return this.name;
  }

  get isTransparent() {
    return (this.opacity !== 1);
  }

  get isWms() {
    return this.type === 'WMS';
  }

  get isWmts() {
    return this.type === 'WMTS';
  }

  get active() {
    return this.activeState === 'on';
  }

  get semiActive() {
    return this.activeState === 'semi';
  }

  get inactive() {
    return this.activeState === 'off';
  }

  get isExclusiveGroup() {
    if (!this.isGroup) {
      throw new Error('This method should not be called on leafs, only on groups.');
    }
    return (this._isExclusiveGroup);
  }
}

export default Layer;
