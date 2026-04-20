// SPDX-License-Identifier: Apache-2.0
import LayerWms from '../../../models/layers/layerwms';
import SelectionParam from '../../../models/selectionparam';
import { Scene as CesiumScene, WebMapServiceImageryProvider, ImageryLayer } from 'cesium';
import IGirafeContext from '../../../tools/context/icontext';

export default class WmsManager3d {
  private readonly context: IGirafeContext;
  map3d: CesiumScene;
  baseLayers: ImageryLayer[] = [];
  // Group maps from the same server into one ImageryLayer
  layersRecord: Record<string, { layers: LayerWms; imagery: ImageryLayer }[]> = {};

  public constructor(map3d: CesiumScene, context: IGirafeContext) {
    this.map3d = map3d;
    this.context = context;
  }

  removeAllBasemapLayers() {
    this.baseLayers.forEach((layer) => this.map3d.imageryLayers.remove(layer));
    this.baseLayers = [];
  }

  addLayer(layerWms: LayerWms) {
    if (!(layerWms.serverUniqueQueryId in this.layersRecord)) {
      this.layersRecord[layerWms.serverUniqueQueryId] = [];
    }
    const newImagery = this.newImagery(layerWms.ogcServer.url, layerWms.layers!);
    this.layersRecord[layerWms.serverUniqueQueryId].push({
      layers: layerWms,
      imagery: newImagery
    });
    this.map3d.imageryLayers.add(newImagery);
  }

  addBasemapLayer(layerWms: LayerWms) {
    this.baseLayers.push(this.newImagery(layerWms.ogcServer.url, layerWms.layers!));
  }

  newImagery(url: string, layers: string, format: string = 'image/png') {
    return new ImageryLayer(
      new WebMapServiceImageryProvider({
        url: url,
        layers: layers,
        parameters: {
          transparent: true,
          format: format
        },
        tileWidth: 4096,
        tileHeight: 4096
      })
    );
  }

  removeLayer(layerWms: LayerWms) {
    const layersEntry = this.layersRecord[layerWms.serverUniqueQueryId];
    if (layersEntry != undefined) {
      this.map3d.imageryLayers.remove(layersEntry.filter((l) => l.layers === layerWms)[0].imagery);
      this.layersRecord[layerWms.serverUniqueQueryId] = layersEntry.filter((l) => l.layers !== layerWms);
    }
  }

  layerExists(layerWms: LayerWms) {
    if (layerWms.serverUniqueQueryId in this.layersRecord) {
      const layerDef = this.layersRecord[layerWms.serverUniqueQueryId];
      const layer = layerDef.find((l) => l.layers.treeItemId === layerWms.treeItemId);
      return layer !== undefined;
    }
    return false;
  }

  changeOpacity(layerWms: LayerWms) {
    this.#manageLayerOptions(layerWms);
  }

  changeFilter(layerWms: LayerWms) {
    this.#manageLayerOptions(layerWms);
  }

  #manageLayerOptions(layerWms: LayerWms) {
    if (!this.layerExists(layerWms)) {
      throw new Error('Cannot change filter for this layer: it does not exist');
    }

    const layersEntry = this.layersRecord[layerWms.serverUniqueQueryId];
    const imagery = layersEntry.filter((l) => l.layers === layerWms)[0].imagery;
    imagery.alpha = layerWms.opacity;
  }

  selectFeatures(extent: number[]) {
    const state = this.context.stateManager.state;
    const selectionParams: SelectionParam[] = [];

    for (const key in this.layersRecord) {
      const layerDef = this.layersRecord[key];
      selectionParams.push(
        new SelectionParam(
          layerDef[0].layers.ogcServer,
          layerDef.map((l) => l.layers),
          state.projection,
          extent
        )
      );
    }

    state.selection.selectionParameters.push(...selectionParams);
  }
}
