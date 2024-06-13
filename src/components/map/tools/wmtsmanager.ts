import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import TileLayer from 'ol/layer/Tile';
import type { Map } from 'ol';
import type { Layer as OLayer } from 'ol/layer';
import type LayerWmts from '../../../models/layers/layerwmts';
import type { SelectionParam } from '../../../tools/state/state';
import StateManager from '../../../tools/state/statemanager';
import LayerWms from '../../../models/layers/layerwms';
import OLayerImage from 'ol/layer/Image';
import OSourceImageWMS from 'ol/source/ImageWMS';

class WmtsManager {
  map: Map;

  wmtsCapabilitiesByServer: Record<string, Record<string, unknown>> = {};
  wmtsLayers: Record<
    string,
    {
      olayer: OLayer;
      layerWmts: LayerWmts;
    }
  > = {};

  basemapLayers: OLayer[] = [];

  get state() {
    return StateManager.getInstance().state;
  }

  constructor(map: Map) {
    this.map = map;
  }

  removeAllBasemapLayers() {
    this.basemapLayers.forEach((basemap) => {
      this.map.removeLayer(basemap);
    });
    this.basemapLayers = [];
  }

  addLayer(layer: LayerWmts) {
    this.#addLayerInternal(layer, false);
  }

  addBasemapLayer(basemap: LayerWmts) {
    this.#addLayerInternal(basemap, true);
  }

  #addLayerInternal(layer: LayerWmts, isBasemap: boolean) {
    this.#getWmtsCapabilities(layer.url, (capabilities) => {
      const options = optionsFromCapabilities(capabilities, {
        layer: layer.layer,
        projection: this.state.projection
      });

      if (options === null) {
        console.warn('Cannot create WMTS layer for layer ' + layer.layer);
        return;
      }

      // Set the right dimensions
      for (const key in layer.dimensions) {
        if (key in options.dimensions) {
          // Update value
          options.dimensions[key] = layer.dimensions[key];
        } else {
          console.warn(
            'A dimension ' +
              key +
              ' was defined for the WMTS layer ' +
              layer.layer +
              ' but the server does not seem to accept it.'
          );
        }
      }

      const olayer = new TileLayer({
        opacity: layer.opacity,
        source: new WMTS(options)
      });

      this.enrichWmtsLayerFromCapabilities(layer, olayer, capabilities);

      let zindex;
      if (isBasemap) {
        this.basemapLayers.push(olayer);
        zindex = -5000 - layer.order;
      } else {
        this.wmtsLayers[layer.layerUniqueId] = { olayer: olayer, layerWmts: layer };
        zindex = -layer.order;
      }

      // Set zindex for this new layer
      // (The bigger the order is, the deeper in the map it should be displayed.)
      // (order is the inverse of z-index)
      // For basemap, set a minimal number (arbitrary defined to less than -5000)
      olayer.setZIndex(zindex);

      // Add to map
      this.map.addLayer(olayer);

      // Add to state
      layer._olayer = olayer;
    });
  }

  enrichWmtsLayerFromCapabilities(layer: LayerWmts, olayer: TileLayer<WMTS>, capabilities: Record<string, unknown>) {
    const layers = (capabilities?.Contents as Record<string, Record<string, string>[]>).Layer ?? [];
    const matchLayer = layers.find((elt) => elt.Identifier == layer.layer);
    if (matchLayer) {
      olayer.set('capabilitiesStyles', matchLayer.Style);
    } else {
      console.warn('No matching layer name in wmts capabilities.');
    }
  }

  removeLayer(layer: LayerWmts) {
    if (this.layerExists(layer)) {
      const olayer = this.wmtsLayers[layer.layerUniqueId].olayer;
      delete this.wmtsLayers[layer.layerUniqueId];
      this.map.removeLayer(olayer);
    } else {
      throw new Error('Cannot remove this layer: it does not exist');
    }
  }

  layerExists(layer: LayerWmts) {
    return layer.layerUniqueId in this.wmtsLayers;
  }

  getLayer(layer: LayerWmts) {
    if (this.layerExists(layer)) {
      return this.wmtsLayers[layer.layerUniqueId].olayer;
    }
    return null;
  }

  changeOpacity(layer: LayerWmts, opacity: number) {
    if (this.layerExists(layer)) {
      const olayer = this.wmtsLayers[layer.layerUniqueId].olayer;
      olayer.setOpacity(opacity);
    } else {
      throw new Error('Cannot change opacity for this layer: it does not exist');
    }
  }

  selectFeatures(extent: number[]) {
    const selectionParams: SelectionParam[] = [];
    Object.values(this.wmtsLayers).forEach((wmtsItem) => {
      const wmtsLayer = wmtsItem.layerWmts;
      const queryLayers = wmtsLayer.wmsLayers ?? wmtsLayer.queryLayers;
      if (!queryLayers || !wmtsLayer.ogcServer) {
        return;
      }
      const ogcServer = { ...wmtsLayer.ogcServer };
      ogcServer.urlWfs = undefined; // To use GetFeatureInfo and not WFS getFeature.
      const layers = queryLayers.split(',').map((wmsLayer) => {
        return new LayerWms(0, wmsLayer, 0, ogcServer, {
          queryLayers,
          layers: queryLayers,
          queryable: true
        });
      });
      const oLayer = new OLayerImage({
        source: new OSourceImageWMS({
          url: layers[0].ogcServer.url,
          params: { LAYERS: queryLayers }
        })
      });
      selectionParams.push({
        layers: layers,
        oLayer: oLayer,
        selectionBox: extent,
        srid: this.state.projection
      });
    });
    StateManager.getInstance().state.selection.selectionParameters.push(...selectionParams);
  }

  #getWmtsCapabilities(url: string, callback: (capabilities: Record<string, unknown>) => void) {
    if (url in this.wmtsCapabilitiesByServer) {
      // Capabilities were already loaded
      const capabilities = this.wmtsCapabilitiesByServer[url];
      callback(capabilities);
    } else {
      // Capabilities were not loaded yet.
      fetch(url)
        .then((response) => response.text())
        .then((capabilities) => {
          // Create new WMTS Layer from Capabilities
          const parser = new WMTSCapabilities();
          const result = parser.read(capabilities);
          this.wmtsCapabilitiesByServer[url] = result;
          callback(result);
        });
    }
  }
}

export default WmtsManager;
