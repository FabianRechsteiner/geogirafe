class Layer {

  // Base properties
  id = null;
  name = null;
  type = null;
  server = null;
  url = null;
  imageType = null;
  layers = null;
  minResolution = null;
  maxResolution = null;
  opacity = null;

  // Legend properties
  legend = null;
  iconUrl = null;
  legendRule = null;
  isLegendExpanded = null;

  // To manage the layers position in WMS queries
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
    this.layers = elem.layers;
    this.minResolution = elem.minResolutionHint;
    this.maxResolution = elem.maxResolutionHint;
    this.opacity = 1;
    this.iconUrl = elem.metadata.iconUrl
    this.legend = elem.metadata.legend;
    this.legendRule = elem.metadata.legendRule;
    this.isLegendExpanded = elem.metadata.isLegendExpanded;

    if (elem.childLayers) {
      this.isGroup = false;
      this.isLayer = true;
    }
    else {
      this.isGroup = true;
      this.isLayer = false;
    }
  }

  hasRestrictedResolution() {
    return (this.minResolution !== 0 || this.maxResolution !== 999999999);
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
}

export default Layer;
