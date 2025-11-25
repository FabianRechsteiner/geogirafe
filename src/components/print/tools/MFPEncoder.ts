import type { BaseCustomizer, MFPLayer, MFPMap, MFPWmtsLayer, MFPWmsLayer } from '@geoblocks/mapfishprint';
import GroupLayer from '../../../models/layers/grouplayer';
import type BaseLayer from '../../../models/layers/baselayer';
import MapManager from '../../../tools/state/mapManager';
import State from '../../../tools/state/state';

import { getAbsoluteUrl, getWmtsMatrices, getWmtsUrl, MFPVectorEncoder } from '@geoblocks/mapfishprint';
import { toDegrees } from 'ol/math';
import LayerLocalFile from '../../../models/layers/layerlocalfile';
import LayerWms from '../../../models/layers/layerwms';
import LayerWmts from '../../../models/layers/layerwmts';
import VectorLayer from 'ol/layer/Vector';
import { isLayerVisible } from './printUtils';
import VectorSource from 'ol/source/Vector';

/** Options for encoding a map. */
export interface EncodeMapOptions {
  state: State;
  mapManager: MapManager;
  scale: number;
  printResolution: number;
  dpi: number;
  customizer: BaseCustomizer;
}

/**
 * Class representing a Mapfish Print Encoder.
 */
export default class MFPEncoder {
  private printResolution = 100;
  private options?: EncodeMapOptions;

  /**
   * Sets the options for encoding the map.
   */
  setOptions(options: EncodeMapOptions) {
    this.options = options;
  }

  /**
   * Encodes the map options, notably the map state and the ol map into a top-level MFPMap object.
   * @returns A Promise that resolves with the encoded map object.
   */
  encodeMap(options: EncodeMapOptions): MFPMap {
    this.setOptions(options);
    const mapManager = options.mapManager;
    const view = mapManager.getMap().getView();
    const center = view.getCenter() ?? [0, 0];
    const projection = view.getProjection().getCode();
    const rotation = toDegrees(view.getRotation());
    this.printResolution = view.getResolution() || 100;
    const allLayers = this.getAllLayers(options.state);
    const mfpLayers = this.encodeLayers(allLayers);
    mfpLayers.unshift(...this.encodeSpecialLayers(mapManager, options.customizer));

    return {
      center,
      dpi: options.dpi,
      projection,
      rotation,
      scale: options.scale,
      layers: mfpLayers,
      useNearestScale: false
    };
  }

  /**
   * @returns An array of all active layers from the state object in the right order
   */
  getAllLayers(state: State) {
    // Sort layers from layertree
    const treeLayers = this.getFlatLayers(state.layers.layersList).filter((layer) => layer.active);
    const sortedLayers = [...treeLayers].sort((a, b) => a.order - b.order);
    // But basemaps are always at the bottom
    const baseMap = state.activeBasemaps?.flatMap((activeBasemap) => activeBasemap.layersList) ?? [];
    return [...sortedLayers, ...baseMap];
  }

  /**
   * @returns The flattened array of base layers.
   */
  getFlatLayers(baseLayers: BaseLayer[]): BaseLayer[] {
    return baseLayers.reduce((layers, layer) => {
      const children = (layer as GroupLayer).children;
      if (children) {
        const group = layer as GroupLayer;
        // If all the children have the same ogcServer and the group
        // has no grandchildren, we keep the layers together
        if (group.isMixed === false && group.hasGrandChildren === false) {
          layers.push(group);
        } else {
          const resultLayers = this.getFlatLayers(group.children);
          layers.push(...resultLayers);
        }
      } else {
        layers.push(layer);
      }
      return layers;
    }, [] as BaseLayer[]);
  }

  /**
   * Encode special layers, meaning not-in-the-layer-tree layers.
   * These layers are from the mapManager.getLayersToPrint method.
   * @returns An array of encodedlayers.
   */
  encodeSpecialLayers(mapManager: MapManager, customizer: BaseCustomizer): MFPLayer[] {
    const encoded = [...mapManager.getLayersToPrint()]
      .sort((olayerA, olayerB) => {
        const indexA = olayerA.getZIndex() ?? 0;
        const indexB = olayerB.getZIndex() ?? 0;
        return indexB - indexA;
      })
      .map((olayer) => {
        if (olayer instanceof VectorLayer) {
          return new MFPVectorEncoder(olayer.getLayerState(), customizer).encodeVectorLayer(this.printResolution);
        }
        return null;
      });
    return encoded.filter((spec) => spec !== null) as MFPLayer[];
  }

  /**
   * Encode layers recursively.
   * @returns a list of Mapfish print layer specs for the given layers.
   */
  encodeLayers(baseLayers: BaseLayer[]): MFPLayer[] {
    const mfpLayers: MFPLayer[] = [];
    for (const layer of baseLayers) {
      const spec = this.encodeLayer(layer);
      if (spec) {
        if (Array.isArray(spec)) {
          mfpLayers.push(...spec);
        } else {
          mfpLayers.push(spec);
        }
      }
    }
    return mfpLayers;
  }

  /**
   * Encodes a layer object according to it's className and options.
   * @returns A promise that resolves to an array of MFP layers, a single MFP layer, or null.
   */
  encodeLayer(layer: BaseLayer): MFPLayer[] | MFPLayer | null {
    switch (layer.className) {
      case GroupLayer.name:
        return this.encodeGroupLayer(layer as GroupLayer);
      case LayerWms.name:
        return this.encodeWmsLayer(layer as LayerWms);
      case LayerWmts.name:
        return this.encodeTileWmtsLayer(layer as LayerWmts);
      case LayerLocalFile.name:
        return this.encodeLocalFileLayer(layer as LayerLocalFile);
      default:
        console.warn('Unsupported layer type for encoding:', layer.className);
        return null;
    }
  }

  /**
   * Only non mixed groups of WMS layers are supported.
   *
   * Will convert a group of WMS layers sharing the same OGC server into a single MFPWmsLayer
   * where its 'layers' property is a concatenation of all child layers' 'layers' property.
   *
   * @param groupLayer
   */
  encodeGroupLayer(groupLayer: GroupLayer): MFPWmsLayer | null {
    if (groupLayer.isMixed) {
      console.error("A mixed group layer is passed to print and shouldn't", groupLayer);
      return null;
    }
    if (groupLayer.hasGrandChildren) {
      console.error("A group layer that has grandchildren is passed to print and shouldn't", groupLayer);
      return null;
    }
    const firstWmsLayer = groupLayer.children.shift() as LayerWms;
    const spec = this.encodeWmsLayer(firstWmsLayer);
    if (!spec) {
      return this.encodeGroupLayer(groupLayer);
    }
    for (const childLayer of groupLayer.children as LayerWms[]) {
      spec.layers.push(childLayer.layers || '');
    }
    return spec;
  }

  /**
   * Encodes an image layer from a WMS layer object.
   * @returns The encoded image layer or null if the layer is not visible.
   */
  encodeWmsLayer(layerWms: LayerWms): MFPWmsLayer | null {
    if (!isLayerVisible(layerWms, this.options?.printResolution)) {
      return null;
    }
    let url = layerWms.ogcServer.url;
    if (layerWms.ogcServer.url.startsWith('//')) {
      url = window.location.protocol + url;
    }
    const url_url = new URL(url);
    const customParams: Record<string, string> = { TRANSPARENT: 'TRUE' };
    if (url_url.searchParams) {
      url_url.searchParams.forEach((value, key) => {
        customParams[key] = value;
      });
    }

    const ogcServer = this.options?.state.ogcServers[layerWms.ogcServer.name];
    let serverType = ogcServer?.type;
    if (serverType === 'arcgis') {
      serverType = undefined;
    }

    const layers = layerWms.layers?.split(',') ?? [''];

    // Add empty styles if needed
    let styles = layerWms.style?.split(',');
    styles ??= [''];
    // Get the same amount of styles than layers to print
    while (layers.length > styles.length) {
      styles.push('');
    }

    const object = {
      baseURL: getAbsoluteUrl(url_url.origin + url_url.pathname),
      imageFormat: layerWms.ogcServer.imageType ?? 'image/png',
      layers: layers,
      customParams: customParams,
      serverType: serverType,
      type: 'wms',
      opacity: layerWms.opacity,
      useNativeAngle: layerWms.printNativeAngle,
      styles: styles
    };
    return object as unknown as MFPWmsLayer;
  }

  /**
   * Encodes a WMTS layer into a MFPWmtsLayer or MFPWmsLayer object.
   * @returns The encoded layer object, or null if the layer is not visible.
   */
  encodeTileWmtsLayer(layerWmts: LayerWmts): MFPWmtsLayer | MFPWmsLayer | null {
    if (!isLayerVisible(layerWmts, this.options?.printResolution)) {
      return null;
    }

    if (layerWmts.printLayers || layerWmts.wmsLayers) {
      // Print configured wms layer instead.
      const spec = this.encodeWmsFromWmtsLayer(layerWmts);
      if (spec) {
        return spec;
      }
    }

    const oLayer = layerWmts._olayer;
    const source = oLayer?.getSource();

    if (!oLayer || !source) {
      console.warn('Can not encode tile layer: ', layerWmts);
      return null;
    }

    const dimensionParams = source.getDimensions();
    const dimensions = Object.keys(dimensionParams);

    return {
      baseURL: getWmtsUrl(source),
      dimensions,
      dimensionParams,
      imageFormat: source.getFormat(),
      layer: source.getLayer(),
      matrices: getWmtsMatrices(source),
      matrixSet: source.getMatrixSet(),
      name: layerWmts.name,
      opacity: layerWmts.opacity,
      requestEncoding: source.getRequestEncoding(),
      style: source.getStyle(),
      type: 'wmts',
      version: source.getVersion()
    };
  }

  /**
   * Encodes a local file layer.
   * @returns The encoded local file layer or null if the layer is not visible.
   */
  encodeLocalFileLayer(layer: LayerLocalFile): MFPLayer | null {
    const vectorSource = new VectorSource({
      features: layer._features
    });
    const olayer = new VectorLayer({
      source: vectorSource
    });

    if (!this.options?.customizer) {
      return null;
    }
    return new MFPVectorEncoder(olayer.getLayerState(), this.options.customizer).encodeVectorLayer(
      this.printResolution
    );
  }

  /**
   * Encodes a WMS layer from a WMTS layer.
   * @returns The encoded WMS layer or null if the ogcServer is missing.
   */
  encodeWmsFromWmtsLayer(layerWmts: LayerWmts): MFPWmsLayer | null {
    if (!layerWmts.ogcServer) {
      console.error('Missing ogcServer');
      return null;
    }

    const printLayers = layerWmts.printLayers ?? layerWmts.wmsLayers ?? '';
    const layerWms = new LayerWms(0, printLayers, 0, layerWmts.ogcServer, { layers: printLayers });
    layerWms.opacity = layerWmts.opacity;
    return this.encodeWmsLayer(layerWms);
  }
}
