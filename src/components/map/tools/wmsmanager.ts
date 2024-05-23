import { Image as ImageLayer } from 'ol/layer';
import ImageWMS from 'ol/source/ImageWMS';
import WMSGetFeatureInfo from 'ol/format/WMSGetFeatureInfo';
import { Map } from 'ol';

import LayerWms from '../../../models/layers/layerwms';
import StateManager from '../../../tools/state/statemanager';
import type { SelectionParam } from '../../../tools/state/state';
import LayerManager from '../../../tools/layermanager';

export default class WmsManager {
  map: Map;
  layerManager: LayerManager;
  resolutionTolerance = 5;

  get state() {
    return StateManager.getInstance().state;
  }

  // The Id of this dictionary if an unique ID that allow the differenciantion of server queries.
  // For example, a combination of server URL and ImageType could be used.
  // Each element of this dictionary will generate 1 WMS server query
  layersByUniqueServerId: Record<
    string,
    {
      layersWms: LayerWms[];
      olayer: ImageLayer<ImageWMS>;
    }
  > = {};

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

  constructor(map: Map) {
    this.map = map;
    this.layerManager = LayerManager.getInstance();

    StateManager.getInstance().subscribe(
      'selection.selectionParameters',
      (_oldParams: SelectionParam[], newParams: SelectionParam[]) => this.onSelectFeatures(newParams)
    );
  }

  onSelectFeatures(selectionParams: SelectionParam[]) {
    this.state.loading = true;
    this.getFeatureInfo(selectionParams).then(() => (this.state.loading = false));
  }

  removeAllBasemapLayers() {
    this.basemapLayers.forEach((basemap) => {
      this.map.removeLayer(basemap);
    });
    this.basemapLayers = [];
  }

  addLayer(layerWms: LayerWms) {
    if (layerWms.serverUniqueQueryId in this.layersByUniqueServerId) {
      // Get existing ol layer for this server
      // and add a new wms layer in the source
      const layerDef = this.layersByUniqueServerId[layerWms.serverUniqueQueryId];
      layerDef.layersWms.push(layerWms);
      const source = this.#createImageWMSSource(layerDef.layersWms);
      layerDef.olayer.setSource(source);
    } else {
      // Create a new ol layer and add it to the right server
      const olayer = new ImageLayer<ImageWMS>();
      const source = this.#createImageWMSSource([layerWms]);
      olayer.setSource(source);

      // Set zindex for this new layer
      // (The bigger the order is, the deeper in the map it should be displayed.)
      // (order is the inverse of z-index)
      olayer.setZIndex(-layerWms.order);

      this.map.addLayer(olayer);

      const layerDef = { olayer: olayer, layersWms: [layerWms] };
      this.layersByUniqueServerId[layerWms.serverUniqueQueryId] = layerDef;
    }

    this.#manageLayerOptions(layerWms);
  }

  #createImageWMSSource(layerList: LayerWms[]) {
    const url = layerList[0].url;
    // Verify that all objects have the same URL.
    // If not, we have a problem, we should not be in this function.
    const sameUrlForAll = layerList.every((layer: LayerWms) => {
      return layer.url === url;
    });
    if (!sameUrlForAll) {
      throw new Error('Not all layers of this list have the same server URL. We should not be in this function.');
    }

    const imageType = layerList[0].imageType;
    // Same check for imageType
    const sameImageTypeForAll = layerList.every((layer: LayerWms) => {
      return layer.url === url;
    });
    if (!sameImageTypeForAll) {
      throw new Error('Not all layers of this list have the same image type. We should not be in this function.');
    }

    const orderedLayers = layerList.slice().sort((l1: LayerWms, l2: LayerWms) => {
      return l2.order - l1.order;
    });
    const orderedLayerNames = orderedLayers.map((l: LayerWms) => l.layers);

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

  addBasemapLayer(layerWms: LayerWms) {
    const source = this.#createImageWMSSource([layerWms]);
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
      } else if (layerWms.serverUniqueQueryId in this.layersByUniqueServerId) {
        // Get existing ol layer for this server and remove the wms layer from the source
        const layerDef = this.layersByUniqueServerId[layerWms.serverUniqueQueryId];
        layerDef.layersWms = layerDef.layersWms.filter((item: LayerWms) => item.treeItemId !== layerWms.treeItemId);

        if (layerDef.layersWms.length > 0) {
          // There are still layers in the list. => We update the layer source
          const source = this.#createImageWMSSource(layerDef.layersWms);
          layerDef.olayer.setSource(source);
        } else {
          // No more layer here.
          // => We simply remove the whole layer
          delete this.layersByUniqueServerId[layerWms.serverUniqueQueryId];
          this.map.removeLayer(layerDef.olayer);
        }
      } else {
        console.warn('Nothing to remove !');
      }
    } else {
      console.error(`Cannot remove WMS-Layer ${layerWms.name} from the map: it does not exist!`);
    }
  }

  layerExists(layerWms: LayerWms) {
    if (layerWms.treeItemId in this.independentLayers) {
      return true;
    }
    if (layerWms.serverUniqueQueryId in this.layersByUniqueServerId) {
      const layerDef = this.layersByUniqueServerId[layerWms.serverUniqueQueryId];
      const layer = layerDef.layersWms.find((l: LayerWms) => l.treeItemId === layerWms.treeItemId);
      return layer !== undefined;
    }
    return false;
  }

  getOLayer(layerWms: LayerWms): ImageLayer<ImageWMS> | null {
    if (layerWms.treeItemId in this.independentLayers) {
      return this.independentLayers[layerWms.treeItemId].olayer;
    }
    if (layerWms.serverUniqueQueryId in this.layersByUniqueServerId) {
      const layerDef = this.layersByUniqueServerId[layerWms.serverUniqueQueryId];
      return layerDef.olayer;
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

    if (!layerWms.hasFilter && !layerWms.isTransparent) {
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
      // The layer has already a configured filter or opacity  => We just change the and/or the filter
      const olayer = this.independentLayers[layerWms.treeItemId].olayer;
      if (layerWms.isTransparent) {
        olayer.setOpacity(layerWms.opacity);
      }
      if (layerWms.hasFilter) {
        (olayer.getSource() as ImageWMS).updateParams({ FILTER: layerWms.filter });
      }
    } else if (layerWms.serverUniqueQueryId in this.layersByUniqueServerId) {
      this.makeLayerIndependent(layerWms);
    }
  }

  makeLayerIndependent(layerWms: LayerWms) {
    if (layerWms.treeItemId in this.independentLayers) {
      // The layer is already independent. => nothing to do here.
    } else if (layerWms.serverUniqueQueryId in this.layersByUniqueServerId) {
      // First, we remove the layer from the default layer
      this.removeLayer(layerWms);
      // Then, we create a new layer
      const source = this.#createImageWMSSource([layerWms]);
      const olayer = new ImageLayer({
        source: source,
        opacity: layerWms.opacity
      });
      if (layerWms.hasFilter) {
        source.updateParams({ FILTER: layerWms.filter });
      }
      this.independentLayers[layerWms.treeItemId] = { layerWms: layerWms, olayer: olayer };
      this.map.addLayer(olayer);
    } else {
      throw new Error('A layer can be made independent only if it has already been added to the map.');
    }
  }

  selectFeatures(extent: number[]) {
    const selectionParams: SelectionParam[] = [];

    for (const key in this.layersByUniqueServerId) {
      selectionParams.push({
        layers: this.layersByUniqueServerId[key].layersWms,
        selectionBox: extent,
        srid: this.state.projection
      });
    }

    for (const key in this.independentLayers) {
      selectionParams.push({
        layers: [this.independentLayers[key].layerWms],
        selectionBox: extent,
        srid: this.state.projection
      });
    }

    StateManager.getInstance().state.selection.selectionParameters = selectionParams;
  }

  async getFeatureInfo(selectionParams: SelectionParam[]) {
    const promises: Promise<void>[] = [];
    selectionParams.forEach((param) => {
      const urls: Set<string> = new Set();
      param.layers.forEach((layer) => {
        const olLayer = this.getOLayer(layer);
        if (layer.queryable && layer.urlWfs == null && olLayer) {
          // Layer is queryable through WMS and is in OL
          const url = olLayer
            .getSource()
            ?.getFeatureInfoUrl(
              [
                (param.selectionBox[0] + param.selectionBox[2]) / 2,
                (param.selectionBox[1] + param.selectionBox[3]) / 2
              ],
              (olLayer.getMapInternal()?.getView().getResolution() ??
                (olLayer.getMinResolution() + olLayer.getMaxResolution()) / 2) + this.resolutionTolerance,
              this.state.projection,
              {
                INFO_FORMAT: 'application/vnd.ogc.gml',
                FEATURE_COUNT: 300
              }
            );
          if (url !== undefined) {
            urls.add(url);
          } else throw new Error(`Unable to construct GetFeatureInfo URL for layer ${layer.name}`);
        }
      });

      urls.forEach((url) => {
        promises.push(
          fetch(url)
            .then((r) => r.text())
            .then((response) => {
              const gmlFeatures = new WMSGetFeatureInfo().readFeatures(response, {
                dataProjection: this.state.projection,
                featureProjection: this.state.projection
              });
              if (gmlFeatures.length === 0 && this.state.selection.selectedFeatures.length == 0) {
                this.state.interface.selectionComponentVisible = false;
              } else {
                this.state.selection.selectedFeatures.push(...gmlFeatures);
                this.state.interface.selectionComponentVisible = true;
              }
            })
        );
      });
    });
    return Promise.all(promises);
  }
}
