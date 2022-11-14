class Layer {

  // Base properties
  id = null;
  name = null;
  type = null;
  server = null;
  url = null;
  imageType = null;
  layers = null;
  queryLayers = null;
  minResolution = null;
  maxResolution = null;
  queryable = false;

  // Legend properties
  legend = null;
  iconUrl = null;
  legendRule = null;
  isLegendExpanded = null;

  // Layer state
  #activeState = 'off'; // can be 'on', 'off', 'semi'
  opacity = 1;
  order = 0;

  get hasLegend() {
    return ((this.legendRule === null || this.legendRule === undefined) && this.legend)
  }

  isGroup = null;
  isLayer = null;

  constructor(elem, server, url) {
    this.name = elem.name;
    this.type = elem.type;
    this.server = server;
    this.url = url;
    this.imageType = elem.imageType;
    this.minResolution = elem.minResolutionHint;
    this.maxResolution = elem.maxResolutionHint;
    this.iconUrl = elem.metadata.iconUrl
    this.legend = elem.metadata.legend;
    this.legendRule = elem.metadata.legendRule;
    this.isLegendExpanded = elem.metadata.isLegendExpanded;

    if (elem.childLayers) {
      // WMS Layer
      this.isGroup = false;
      this.isLayer = true;
      this.layers = elem.layers;
      // TODO REG: Is it possible that 1 childlayer is queryable, and another one not ?
      this.queryable = elem.childLayers[0].queryable;
      this.queryLayers = (this.queryable) ? elem.childLayers.map(l => l.name).join(',') : '';
    }
    else if (elem.type === 'WMTS') {
      // WMTS Layer
      this.isGroup = false;
      this.isLayer = true;
      this.layers = elem.layer;
    }
    else {
      // Other cases: Groups
      this.isGroup = true;
      this.isLayer = false;
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
    return this.server + this.imageType;
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
    return this.#activeState === 'on';
  }

  get semiActive() {
    return this.#activeState === 'semi';
  }

  get inactive() {
    return this.#activeState === 'off';
  }

  set active(val) {
    if (val === true || val === 'on') {
      this.#activeState = 'on';
    }
    else if (val === false || val === 'off') {
      this.#activeState = 'off';
    }
    else if (val === 'semi') {
      this.#activeState = 'semi';
    }
    else {
      throw Error('Unknown state for layer !');
    }
  }
}

export default Layer;
