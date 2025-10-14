import { Image as ImageLayer } from 'ol/layer';
import ImageWMS from 'ol/source/ImageWMS';
import WMSCapabilities from 'ol/format/WMSCapabilities.js';
import WMSGetFeatureInfo from 'ol/format/WMSGetFeatureInfo';
import { Map } from 'ol';
import LayerWms from '../../models/layers/layerwms';
import StateManager from '../state/statemanager';
import SelectionParam from '../../models/selectionparam';
import LayerManager from '../layers/layermanager';
import WfsFilter from '../wfs/wfsfilter';
import ServerOgc from '../../models/serverogc';
import ConfigManager from '../configuration/configmanager';
import Exception from 'jsts/java/lang/Exception';

export default abstract class WmsClient {
  map: Map;
  ogcServer: ServerOgc;
  layerManager: LayerManager;
  configManager: ConfigManager;
  resolutionTolerance = 5;
  capabilityPromise: Promise<Record<string, unknown>> | null = null;
  capabilities: Record<string, unknown> | null = null;

  get state() {
    return StateManager.getInstance().state;
  }

  get audienceExcludedPaths() {
    return (
      this.configManager.Config.oauth?.issuer.audienceExcludedPaths ??
      this.configManager.Config.gmfauth?.audienceExcludedPaths ??
      []
    );
  }

  // The Id of this dictionary if an unique ID that allow the differenciantion of server queries.
  // For example, a combination of server URL and ImageType could be used.
  // Each element of this dictionary will generate 1 WMS server query
  layers: LayerWms[] = [];
  olayer?: ImageLayer<ImageWMS>;

  // Independent layers are layers that need to be queried alone
  // (not combine to other WMS layers in the same query)
  // The treeItemId will be used as key for this dictionary
  independentLayers: Record<
    string,
    {
      layerWms: LayerWms;
      olayer: ImageLayer<ImageWMS>;
    }
  > = {};

  basemapLayers: ImageLayer<ImageWMS>[] = [];

  constructor(ogcServer: ServerOgc, map: Map) {
    this.ogcServer = ogcServer;
    this.map = map;
    this.layerManager = LayerManager.getInstance();
    this.configManager = ConfigManager.getInstance();
  }

  get uniqueQueryId(): string {
    return this.ogcServer.uniqueWmsQueryId;
  }

  removeAllBasemapLayers() {
    this.basemapLayers.forEach((basemap) => {
      this.map.removeLayer(basemap);
    });
    this.basemapLayers = [];
  }

  public addLayer(layerWms: LayerWms) {
    this.addLayerInternal(layerWms);
    this.manageLayerOptions(layerWms);
  }

  private addLayerInternal(layerWms: LayerWms) {
    this.layers.push(layerWms);
    if (!this.olayer) {
      // Create a new ol layer and add it to the right server
      this.olayer = new ImageLayer<ImageWMS>();

      // Set zindex for this new layer
      // (The bigger the order is, the deeper in the map it should be displayed.)
      // (order is the inverse of z-index)
      this.olayer.setZIndex(-layerWms.order);

      this.map.addLayer(this.olayer);
    }

    const source = this.createImageWMSSource();
    this.olayer.setSource(source);
  }

  public createImageWMSSource(layerList: LayerWms[] = this.layers) {
    const url = this.ogcServer.url;
    const imageType = this.ogcServer.imageType;

    const orderedLayers = layerList.slice().sort((l1: LayerWms, l2: LayerWms) => {
      return l2.order - l1.order;
    });
    const orderedLayerNames = this.getOpenLayerLayerNames(orderedLayers);

    const requestedUrl = new URL(url);
    const shouldExclude = this.audienceExcludedPaths.some((pattern) => new RegExp(pattern).test(requestedUrl.pathname));
    const crossOrigin =
      this.state.oauth.audience?.includes(requestedUrl.hostname) && !shouldExclude ? 'use-credentials' : 'anonymous';

    const source = new ImageWMS({
      url: url,
      params: {
        LAYERS: orderedLayerNames,
        FORMAT: imageType
      },
      crossOrigin: crossOrigin
    });

    // We intercept the event in order to set an error icon if the WMS query has an error
    // Otherwise we do no see anything on the client.
    source.on('imageloaderror', () => {
      for (const layerWms of layerList) {
        this.layerManager.setError(layerWms, 'Image cannot be loaded from WMS Server');
      }
    });
    source.on('imageloadend', () => {
      for (const layerWms of layerList) {
        this.layerManager.unsetError(layerWms);
      }
    });

    return source;
  }

  abstract getOpenLayerLayerNames(layerList: LayerWms[]): string[];

  addBasemapLayer(layerWms: LayerWms) {
    const source = this.createImageWMSSource([layerWms]);
    const olayer = new ImageLayer({
      source: source,
      opacity: layerWms.opacity
    });

    // For basemap, set a minimal number (arbitrary defined to less than -5000)
    olayer.setZIndex(-5000 - layerWms.order);

    this.basemapLayers.push(olayer);
    this.map.addLayer(olayer);
  }

  removeLayer(layerWms: LayerWms) {
    if (this.layerExists(layerWms)) {
      if (layerWms.treeItemId in this.independentLayers) {
        const olayer = this.independentLayers[layerWms.treeItemId].olayer;
        delete this.independentLayers[layerWms.treeItemId];
        this.map.removeLayer(olayer);
      } else if (this.layerInStandardLayers(layerWms)) {
        // Get existing ol layer for this server and remove the wms layer from the source
        this.layers = this.layers.filter((l: LayerWms) => l.treeItemId !== layerWms.treeItemId);

        if (this.layers.length > 0) {
          // There are still layers in the list. => We update the layer source
          const source = this.createImageWMSSource();
          this.olayer!.setSource(source);
        } else if (this.olayer) {
          // No more layer here.
          // => We simply remove the whole layer
          this.map.removeLayer(this.olayer);
          delete this.olayer;
        }
      } else {
        console.warn('Nothing to remove !');
      }
    } else {
      console.error(`Cannot remove WMS-Layer ${layerWms.name} from the map: it does not exist!`);
    }
  }

  layerExists(layerWms: LayerWms) {
    return this.layerInStandardLayers(layerWms) || this.layerIsIndependantLayer(layerWms);
  }

  layerInStandardLayers(layerWms: LayerWms) {
    return this.layers.some((l) => l.treeItemId === layerWms.treeItemId);
  }

  layerIsIndependantLayer(layerWms: LayerWms) {
    return layerWms.treeItemId in this.independentLayers;
  }

  getOLayer(layerWms: LayerWms): ImageLayer<ImageWMS> | null {
    if (layerWms.treeItemId in this.independentLayers) {
      return this.independentLayers[layerWms.treeItemId].olayer;
    }
    if (this.layerInStandardLayers(layerWms)) {
      return this.olayer!;
    }
    return null;
  }

  public changeOpacity(layerWms: LayerWms) {
    this.manageLayerOptions(layerWms);
  }

  public changeFilter(layerWms: LayerWms) {
    this.manageLayerOptions(layerWms);
  }

  public changeTimeRestriction(layerWms: LayerWms) {
    this.manageLayerOptions(layerWms);
  }

  public prepareSwipe(layerWms: LayerWms) {
    this.manageLayerOptions(layerWms);
  }

  private manageLayerOptions(layerWms: LayerWms) {
    if (!this.layerExists(layerWms)) {
      throw new Error('Cannot change filter for this layer: it does not exist');
    }

    const isLayerIndependant = layerWms.treeItemId in this.independentLayers;
    const mustBeIndependant =
      layerWms.hasFilter || layerWms.hasTimeRestriction || layerWms.isTransparent || layerWms.swiped !== 'no';

    if (isLayerIndependant && !mustBeIndependant) {
      const olayer = this.independentLayers[layerWms.treeItemId].olayer;
      // We delete the layer from the transparent layers
      delete this.independentLayers[layerWms.treeItemId];
      this.map.removeLayer(olayer);
      // And add it to the normal layer again
      this.addLayerInternal(layerWms);
    } else if (!isLayerIndependant && mustBeIndependant) {
      this.makeLayerIndependent(layerWms);
    }

    const olayer = this.getOLayer(layerWms);
    if (!olayer) {
      throw new Exception('The layer must exist at this state!');
    }

    if (layerWms.isTransparent) {
      olayer.setOpacity(layerWms.opacity);
    }
    this.updateLayerFilter(layerWms, olayer);
    this.updateTimeRestriction(layerWms, olayer);
  }

  private makeLayerIndependent(layerWms: LayerWms) {
    if (layerWms.treeItemId in this.independentLayers) {
      // The layer is already independent. => nothing to do here.
    } else if (this.layerInStandardLayers(layerWms)) {
      // First, we remove the layer from the default layer
      this.removeLayer(layerWms);
      // Then, we create a new layer
      const source = this.createImageWMSSource([layerWms]);
      const olayer = new ImageLayer({
        source: source,
        opacity: layerWms.opacity
      });
      this.independentLayers[layerWms.treeItemId] = { layerWms: layerWms, olayer: olayer };
      this.map.addLayer(olayer);
    } else {
      throw new Error('A layer can be made independent only if it has already been added to the map.');
    }
  }

  private updateLayerFilter(layerWms: LayerWms, olayer: ImageLayer<ImageWMS>) {
    const source = olayer.getSource() as ImageWMS;
    if (layerWms.hasFilter) {
      const filterStr = this.buildFilterQuery(layerWms);
      source.updateParams({ FILTER: filterStr });
    } else {
      // If present, remove the filter parameter
      const params = source.getParams();
      if (params.FILTER) {
        delete params.FILTER;
        source.updateParams(params);
      }
    }
  }

  abstract buildFilterQuery(layerWms: LayerWms): string;

  private updateTimeRestriction(layerWms: LayerWms, olayer: ImageLayer<ImageWMS>) {
    const source = olayer.getSource() as ImageWMS;
    if (layerWms.hasTimeRestriction) {
      (olayer.getSource() as ImageWMS).updateParams({ TIME: layerWms.timeRestriction });
    } else {
      // If present, remove the time parameter
      const params = source.getParams();
      if (params.TIME) {
        delete params.TIME;
        source.updateParams(params);
      }
    }
  }

  selectFeatures(extent: number[]) {
    if (this.layers.length === 0 && !this.independentLayers) {
      return;
    }

    const selectionParams: SelectionParam[] = [];
    if (this.ogcServer.wfsSupport && this.layers.length > 0) {
      selectionParams.push(new SelectionParam(this.ogcServer, this.layers, this.state.projection, extent, this.olayer));
    } else {
      // This will need a WMS GetFeatureInfo.
      // In this case multiple layers are not allowed, and we have to create 1 selection param per layer
      for (const layer of this.layers) {
        selectionParams.push(new SelectionParam(this.ogcServer, [layer], this.state.projection, extent, this.olayer));
      }
    }

    for (const key in this.independentLayers) {
      const indepLayer = this.independentLayers[key];
      selectionParams.push(
        new SelectionParam(this.ogcServer, [indepLayer.layerWms], this.state.projection, extent, indepLayer.olayer)
      );
    }

    this.state.selection.selectionParameters.push(...selectionParams);
  }

  /**
   * Selects features based on the specified query and prepares selection parameters.
   */
  selectFeaturesByQuery(query: WfsFilter[]) {
    const selectionParams: SelectionParam[] = [];

    selectionParams.push(
      new SelectionParam(this.ogcServer, this.layers, this.state.projection, undefined, this.olayer, query)
    );

    for (const key in this.independentLayers) {
      const indepLayer = this.independentLayers[key];
      selectionParams.push(
        new SelectionParam(
          this.ogcServer,
          [indepLayer.layerWms],
          this.state.projection,
          undefined,
          indepLayer.olayer,
          query
        )
      );
    }

    this.state.selection.selectionParameters.push(...selectionParams);
  }

  public async getFeatureInfo(selectionParam: SelectionParam) {
    const urlsAndLayerNames = this.getFeatureInfoUrl(selectionParam);
    const promises = Object.keys(urlsAndLayerNames).map((url) =>
      fetch(url)
        .then((r) => r.text())
        .then((response) => this.handleGetFeatureInfoResponse(response, url, urlsAndLayerNames))
    );
    return (await Promise.all(promises)).flat();
  }

  private getFeatureInfoUrl(param: SelectionParam): Record<string, string> {
    /* Url-layerName (feature id) objects. */
    const urlsAndLayerNames: Record<string, string> = {};
    const currentResolution = this.state.position.resolution;
    if (!currentResolution) {
      console.log('WMSClient called before resolution is set.');
      return urlsAndLayerNames;
    }
    param._layers.forEach((layer) => {
      const olLayer = param._oLayer ?? this.getOLayer(layer);
      if (!layer.queryable || !olLayer || !layer.isVisibleAtResolution(currentResolution)) {
        return;
      }
      // Layer is queryable through WMS and has an OL layer.
      const coordinate = param.selectionBox
        ? [(param.selectionBox[0] + param.selectionBox[2]) / 2, (param.selectionBox[1] + param.selectionBox[3]) / 2]
        : [];
      const url = olLayer
        .getSource()
        ?.getFeatureInfoUrl(
          coordinate,
          (olLayer.getMapInternal()?.getView().getResolution() ?? currentResolution) + this.resolutionTolerance,
          this.state.projection,
          {
            INFO_FORMAT: 'application/vnd.ogc.gml',
            FEATURE_COUNT: 300
          }
        );
      if (url !== undefined) {
        urlsAndLayerNames[url] = layer.name;
      } else throw new Error(`Unable to construct GetFeatureInfo URL for layer ${layer.name}`);
    });
    return urlsAndLayerNames;
  }

  private handleGetFeatureInfoResponse(response: string, url: string, urlsAndLayerNames: Record<string, string>) {
    const gmlFeatures = new WMSGetFeatureInfo().readFeatures(response, {
      dataProjection: this.state.projection,
      featureProjection: this.state.projection
    });
    // Set the feature id with the layer name.
    gmlFeatures.forEach((feature) => {
      if (!feature.getId()) {
        feature.setId(urlsAndLayerNames[url]);
      }
    });
    return gmlFeatures;
  }

  public refreshZIndexes() {
    // Recalculate source for Layers
    if (this.layers.length > 0) {
      // TODO: openLayer zindex = -order of the last layer in this.layers? not consistent: to improve?
      for (const layerWms of this.layers) {
        const zindex = -layerWms.order;
        this.olayer!.setZIndex(zindex);
      }
      const source = this.createImageWMSSource(this.layers);
      this.olayer!.setSource(source);
    }

    // Manage independant layers
    for (const obj of Object.values(this.independentLayers)) {
      const zindex = -obj.layerWms.order;
      obj.olayer.setZIndex(zindex);
    }
  }

  public async getWmsCapabilities(): Promise<Record<string, unknown>> {
    if (this.capabilityPromise !== null) {
      return this.capabilityPromise;
    }

    if (this.capabilities !== null) {
      // Capabilities were already loaded
      return Promise.resolve(this.capabilities);
    }

    this.capabilityPromise = (async () => {
      // Capabilities were not loaded yet.
      const params = new URLSearchParams();
      params.append('REQUEST', 'GetCapabilities');
      params.append('SERVICE', 'WMS');
      params.append('VERSION', '1.3.0');
      const response = await fetch(`${this.ogcServer.url}?${params}`);
      const result = await response.text();

      // Create new WMS Layer from Capabilities
      const parser = new WMSCapabilities();
      this.capabilities = parser.read(result) as Record<string, unknown>;
      return this.capabilities;
    })();

    return this.capabilityPromise;
  }
}

export class WmsClientQgis extends WmsClient {
  /** QGIS-server does not filter on a WMS layer made from multiple underlying WFS queryLayers
   * Solution: directly query the queryLayers
   */
  getOpenLayerLayerNames(layerList: LayerWms[]) {
    const hasFilter = layerList.some((layerWms) => layerWms.hasFilter);
    if (hasFilter) {
      const layerNames = layerList.map((l: LayerWms) => l.queryLayers?.split(',')).flat();
      return layerNames as string[];
    } else {
      const layerNames = layerList.map((l: LayerWms) => l.layers ?? l.name);
      return layerNames;
    }
  }

  /** MapServer wants 1 filter per underlying WFS queryLayer, all included in parentheses
   * QGIS-server wants 1 filter per underlying WFS queryLayer, each in its own in parentheses
   *
   * MapServer: (<filter>...</filter><filter>...</filter>)
   * QGIS-server: (<filter>...</filter>)(<filter>...</filter>)
   */
  buildFilterQuery(layerWms: LayerWms) {
    let filterStr = '';
    if (layerWms.hasFilter) {
      const filter = layerWms.filter as WfsFilter;
      const nbQuerylayers = layerWms.queryLayers!.split(',').length;
      filterStr = ('(' + filter.toWmsGetMapFilter() + ')').repeat(nbQuerylayers);
    }
    return filterStr;
  }
}

export class WmsClientMapServer extends WmsClient {
  getOpenLayerLayerNames(layerList: LayerWms[]) {
    return layerList.map((l: LayerWms) => l.layers) as string[];
  }

  buildFilterQuery(layerWms: LayerWms): string {
    let filterStr = '';
    if (layerWms.hasFilter) {
      const filter = layerWms.filter as WfsFilter;
      const nbQuerylayers = layerWms.queryLayers!.split(',').length;
      filterStr = '(' + filter.toWmsGetMapFilter().repeat(nbQuerylayers) + ')';
    }
    return filterStr;
  }
}

export const WmsClientDefault = WmsClientQgis;
export const WmsClientGeoServer = WmsClientMapServer;
