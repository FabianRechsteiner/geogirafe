import { Image as ImageLayer } from 'ol/layer';
import ImageWMS from 'ol/source/ImageWMS';
import WMSGetFeatureInfo from 'ol/format/WMSGetFeatureInfo';
import { Map } from 'ol';

import LayerWms from '../../models/layers/layerwms';
import StateManager from '../state/statemanager';
import SelectionParam from '../../models/selectionparam';
import LayerManager from '../layers/layermanager';
import WfsFilter from '../wfs/wfsfilter';
import ServerOgc from '../../models/serverogc';

export default abstract class WmsClient {
  map: Map;
  ogcServer: ServerOgc;
  layerManager: LayerManager;
  resolutionTolerance = 5;

  get state() {
    return StateManager.getInstance().state;
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

  addLayer(layerWms: LayerWms) {
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

    this.#manageLayerOptions(layerWms);
  }

  public createImageWMSSource(layerList: LayerWms[] = this.layers) {
    const url = this.ogcServer.url;
    const imageType = this.ogcServer.imageType;

    const orderedLayers = layerList.slice().sort((l1: LayerWms, l2: LayerWms) => {
      return l2.order - l1.order;
    });
    const orderedLayerNames = this.getOpenLayerLayerNames(orderedLayers);

    const source = new ImageWMS({
      url: url,
      params: {
        LAYERS: orderedLayerNames,
        FORMAT: imageType
      }
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

  // TODO SMS: Refactor this so it's actually a helper for the private function
  changeOpacity(layerWms: LayerWms) {
    this.#manageLayerOptions(layerWms);
  }

  // TODO SMS: Refactor this so it's actually a helper for the private function
  changeFilter(layerWms: LayerWms) {
    this.#manageLayerOptions(layerWms);
  }

  #manageLayerOptions(layerWms: LayerWms) {
    if (!this.layerExists(layerWms)) {
      throw new Error('Cannot change filter for this layer: it does not exist');
    }

    if (!layerWms.hasFilter && !layerWms.isTransparent && layerWms.swiped === 'no') {
      // There is no more filter or opacity => Back to normal
      if (layerWms.treeItemId in this.independentLayers) {
        const olayer = this.independentLayers[layerWms.treeItemId].olayer;
        // We delete the layer from the transparent layers
        delete this.independentLayers[layerWms.treeItemId];
        this.map.removeLayer(olayer);
        // And add it to the normal layer again
        this.addLayer(layerWms);
      }
    } else if (layerWms.treeItemId in this.independentLayers) {
      // The layer has already a configured filter or opacity  => We just change the opacity and/or filter
      const olayer = this.independentLayers[layerWms.treeItemId].olayer;
      if (layerWms.isTransparent) {
        olayer.setOpacity(layerWms.opacity);
      }
      this.updateOpenLayerFilter(layerWms);
    } else if (this.layerInStandardLayers(layerWms)) {
      this.makeLayerIndependent(layerWms);
    }
  }

  makeLayerIndependent(layerWms: LayerWms) {
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
      this.updateOpenLayerFilter(layerWms);
      this.map.addLayer(olayer);
    } else {
      throw new Error('A layer can be made independent only if it has already been added to the map.');
    }
  }

  abstract updateOpenLayerFilter(layerWms: LayerWms): void;

  selectFeatures(extent: number[]) {
    const selectionParams: SelectionParam[] = [];
    selectionParams.push(new SelectionParam(this.ogcServer, this.layers, extent, this.state.projection, this.olayer));

    for (const key in this.independentLayers) {
      const indepLayer = this.independentLayers[key];
      selectionParams.push(
        new SelectionParam(this.ogcServer, [indepLayer.layerWms], extent, this.state.projection, indepLayer.olayer)
      );
    }

    this.state.selection.selectionParameters.push(...selectionParams);
  }

  async getFeatureInfo(selectionParam: SelectionParam) {
    //const promises: Promise<void>[] = [];
    const urlsAndLayerNames = this.getFeatureInfoUrl(selectionParam);
    const promises = Object.keys(urlsAndLayerNames).map((url) =>
      fetch(url) //, {credentials: "include"})
        .then((r) => r.text())
        .then((response) => this.handleGetFeatureInfoResponse(response, url, urlsAndLayerNames))
    );
    return (await Promise.all(promises)).flat();
  }

  private getFeatureInfoUrl(param: SelectionParam): Record<string, string> {
    /* Url-layerName (feature id) objects. */
    const urlsAndLayerNames: Record<string, string> = {};
    param._layers.forEach((layer) => {
      const olLayer = param._oLayer ?? this.getOLayer(layer);
      if (!layer.queryable || !olLayer || !layer.isVisibleAtResolution(this.state.position.resolution)) {
        return;
      }
      // Layer is queryable through WMS and has an OL layer.
      const url = olLayer
        .getSource()
        ?.getFeatureInfoUrl(
          [(param.selectionBox[0] + param.selectionBox[2]) / 2, (param.selectionBox[1] + param.selectionBox[3]) / 2],
          (olLayer.getMapInternal()?.getView().getResolution() ?? this.state.position.resolution) +
            this.resolutionTolerance,
          this.state.projection,
          {
            INFO_FORMAT: 'application/vnd.ogc.gml',
            FEATURE_COUNT: 300
          }
        );
      if (url !== undefined) {
        // TODO: urlsAndLayerNames[url] points to the last layer using this URL?? inconsistent
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
        // TODO: setting id to urlsAndLayerNames[url] sets id to the last layer used for the url in getFeatureInfoUrl()...?
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
}

export class WmsClientQgis extends WmsClient {
  /** QGIS-server does not filter on a WMS layer made from multiple underlying WFS queryLayers
   * Solution: query directly the queryLayers
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
  updateOpenLayerFilter(layerWms: LayerWms) {
    if (layerWms.hasFilter && layerWms.treeItemId in this.independentLayers) {
      const filter = layerWms.filter as WfsFilter;
      const nbQuerylayers = layerWms.queryLayers!.split(',').length;
      const filtrerStr = ('(' + filter.toWmsGetMapFilter() + ')').repeat(nbQuerylayers);
      const olayer = this.independentLayers[layerWms.treeItemId].olayer;
      (olayer.getSource() as ImageWMS).updateParams({ FILTER: filtrerStr });
    }
  }
}

export class WmsClientMapServer extends WmsClient {
  getOpenLayerLayerNames(layerList: LayerWms[]) {
    return layerList.map((l: LayerWms) => l.layers) as string[];
  }

  updateOpenLayerFilter(layerWms: LayerWms) {
    if (layerWms.hasFilter && layerWms.treeItemId in this.independentLayers) {
      const filter = layerWms.filter as WfsFilter;
      const nbQuerylayers = layerWms.queryLayers!.split(',').length;
      const filtrerStr = '(' + filter.toWmsGetMapFilter().repeat(nbQuerylayers) + ')';
      const olayer = this.independentLayers[layerWms.treeItemId].olayer;
      (olayer.getSource() as ImageWMS).updateParams({ FILTER: filtrerStr });
    }
  }
}
