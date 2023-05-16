class Layer {

  // Base properties
  id = null;
  name = null;
  type = null;
  isDefaultChecked = null;

  // For hierarchy management
  children = [];
  parent = null;

  // VectorTiles
  style = null;
  projection = null;

  // WMS & WMTS
  server = null;
  url = null;
  imageType = null;
  layers = null;
  dimensions = null;
  queryLayers = null;
  minResolution = null;
  maxResolution = null;
  queryable = false;

  // Legend properties
  legend = null;
  iconUrl = null;
  legendRule = null;
  legendImage = null;
  isLegendExpanded = null;

  // Layer state
  activeState = 'off'; // can be 'on', 'off', 'semi'
  opacity = 1;
  order = 0;

  // Is this layer used as basemap ?
  basemap = false;

  get hasLegend() {
    return ((this.legendRule === null || this.legendRule === undefined) && this.legend)
  }

  isGroup = null;
  isLayer = null;

  isExpanded = false;

  constructor(elem, serverName, url, urlWfs, order) {
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
    }
    else if (elem.type === 'WMTS') {
      this.url = elem.url;
      this.isGroup = false;
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
      this.isLegendExpanded = elem.metadata.isLegendExpanded;
      this.legendImage = elem.metadata.legendImage;

      if (elem.childLayers) {
        // WMS Layer
        this.isGroup = false;
        this.isLayer = true;
        this.layers = elem.layers;
        // TODO REG: Is it possible that 1 childlayer is queryable, and another one not ?
        this.queryable = elem.childLayers[0].queryable;
        this.queryLayers = (this.queryable) ? elem.childLayers.map(l => l.name).join(',') : '';
      }
    }
    else {
      // Other cases: Groups
      this.isGroup = true;
      this.isLayer = false;
    }

    // }
    // else {
    //   throw 'Unmanaged layer type: ' + elem.type;
    // }
  }

  hasRestrictedResolution() {
    return ((this.minResolution !== undefined && this.minResolution !== 0) 
         || (this.maxResolution !== undefined && this.maxResolution !== 999999999));
  }

  get legendId() {
    return 'LEG-' + this.id;
  }

  get serverUniqueQueryId() {
    return this.server + this.imageType;
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

  get areAllChildrenActive() {
    let allActive = true;
    for (let i=0; i<this.children.length; ++i) {
      if (!this.children[i].active) {
        allActive = false;
      }
    }
    return allActive;
  }

  get areAllChildrenInactive() {
    let allInactive = true;
    for (let i=0; i<this.children.length; ++i) {
      if (!this.children[i].inactive) {
        allInactive = false;
      }
    }
    return allInactive;
  }
}

export default Layer;
