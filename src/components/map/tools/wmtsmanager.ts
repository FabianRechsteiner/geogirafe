import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import TileLayer from 'ol/layer/Tile';
import type { Map } from 'ol';
import type { Layer as OLayer } from 'ol/layer';
import type LayerWmts from '../../../models/layers/layerwmts';
import SelectionParam from '../../../models/selectionparam';
import StateManager from '../../../tools/state/statemanager';
import LayerWms from '../../../models/layers/layerwms';
import OLayerImage from 'ol/layer/Image';
import OSourceImageWMS from 'ol/source/ImageWMS';
import ServerOgc from '../../../models/serverogc';

// TODO REG : Move to core, because we have a cross-dependency issue with the extlayers component
class WmtsManager {
  map: Map;
  private readonly stateManager: StateManager;

  wmtsCapabilitiesByServer: Record<string, Record<string, unknown>> = {};
  wmtsPromisesByServer: Record<string, Promise<Record<string, unknown>>> = {};
  wmtsAbortsByLayer: Record<string, AbortController> = {};

  wmtsLayers: Record<
    string,
    {
      olayer: OLayer;
      layerWmts: LayerWmts;
    }
  > = {};

  basemapLayers: Record<
    string,
    {
      olayer: OLayer;
      layerWmts: LayerWmts;
    }
  > = {};

  get state() {
    return this.stateManager.state;
  }

  constructor(map: Map, stateManager: StateManager) {
    this.map = map;
    this.stateManager = stateManager;
  }

  removeAllBasemapLayers() {
    Object.values(this.basemapLayers).forEach((basemap) => {
      this.map.removeLayer(basemap.olayer);
    });
    this.basemapLayers = {};
  }

  public async addLayer(layer: LayerWmts) {
    await this.addLayerInternal(layer, false);
    this.manageLayerOptions(layer);
  }

  public addBasemapLayer(basemap: LayerWmts) {
    this.addLayerInternal(basemap, true);
  }

  private async addLayerInternal(layer: LayerWmts, isBasemap: boolean) {
    console.debug(`Adding WMTS Layer ${layer.name} : UniqueID=${layer.layerUniqueId}`);
    const abortController = new AbortController();
    this.wmtsAbortsByLayer[layer.layerUniqueId] = abortController;
    const capabilities = await this.getWmtsCapabilities(layer.url);

    if (abortController.signal.aborted) {
      // The layer was removed during the async loading of Capabilities.
      // => Do not add the layer
      console.debug(`Aborting WMTS Layer ${layer.name} : UniqueID=${layer.layerUniqueId}`);
      return;
    }

    // Remove the abort controller from the list.
    delete this.wmtsAbortsByLayer[layer.layerUniqueId];
    console.debug(`Displaying WMTS Layer ${layer.name} : UniqueID=${layer.layerUniqueId}`);

    let olayer = layer._olayer;
    if (!olayer) {
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

      olayer = new TileLayer({
        opacity: layer.opacity,
        source: new WMTS(options)
      });

      this.enrichWmtsLayerFromCapabilities(layer, olayer, capabilities);
      layer._olayer = olayer;
    }

    // Set zindex for this new layer
    // (The bigger the order is, the deeper in the map it should be displayed.)
    // (order is the inverse of z-index)
    // For basemap, set a minimal number (arbitrary defined to less than -5000)
    let zindex;
    if (isBasemap) {
      this.basemapLayers[layer.layerUniqueId] = { olayer: olayer, layerWmts: layer };
      zindex = -5000 - layer.order;
    } else {
      this.wmtsLayers[layer.layerUniqueId] = { olayer: olayer, layerWmts: layer };
      zindex = -layer.order;
    }
    olayer.setZIndex(zindex);

    // Add to map
    if (!this.map.getLayers().getArray().includes(olayer)) {
      this.map.addLayer(olayer);
    }
  }

  public refreshZIndexes() {
    for (const obj of Object.values(this.wmtsLayers)) {
      const zindex = -obj.layerWmts.order;
      obj.olayer.setZIndex(zindex);
    }
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
    console.debug(`Removal asked for WMTS Layer ${layer.name} : UniqueID=${layer.layerUniqueId}`);
    if (layer.layerUniqueId in this.wmtsAbortsByLayer) {
      // The Capabilities are curently loading.
      // We cannot remove the layer yet, it has not been added, but we can abort the loading
      console.debug(`Cancelling WMTS Layer ${layer.name} : UniqueID=${layer.layerUniqueId}`);
      const abortController = this.wmtsAbortsByLayer[layer.layerUniqueId];
      abortController.abort();
    } else if (this.layerExists(layer)) {
      console.debug(`Removing WMTS Layer ${layer.name} : UniqueID=${layer.layerUniqueId}`);
      const olayer = this.wmtsLayers[layer.layerUniqueId].olayer;
      delete this.wmtsLayers[layer.layerUniqueId];
      this.map.removeLayer(olayer);
    } else {
      throw new Error(`Cannot remove ${layer.name}: it does not exist`);
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

  public changeOpacity(layer: LayerWmts) {
    this.manageLayerOptions(layer);
  }

  private manageLayerOptions(layer: LayerWmts) {
    if (!this.layerExists(layer)) {
      throw new Error('Cannot change opacity for this layer: it does not exist');
    }

    if (layer.isTransparent) {
      const olayer = this.wmtsLayers[layer.layerUniqueId].olayer;
      olayer.setOpacity(layer.opacity);
    }
  }

  selectFeatures(extent: number[]) {
    const selectionParams: SelectionParam[] = [];
    const allWmtsLayers = [...Object.values(this.basemapLayers), ...Object.values(this.wmtsLayers)];
    allWmtsLayers.forEach((wmtsItem) => {
      const wmtsLayer = wmtsItem.layerWmts;
      const queryLayers = wmtsLayer.wmsLayers ?? wmtsLayer.queryLayers;
      if (!queryLayers || !wmtsLayer.ogcServer) {
        return;
      }
      const ogcServer = new ServerOgc(wmtsLayer.ogcServer.name, wmtsLayer.ogcServer);
      const layers = queryLayers.split(',').map((wmsLayer) => {
        return new LayerWms(0, wmsLayer, 0, ogcServer, {
          queryLayers,
          layers: queryLayers,
          queryable: true
        });
      });
      const oLayer = new OLayerImage({
        source: new OSourceImageWMS({
          url: ogcServer.url,
          params: { LAYERS: queryLayers }
        })
      });
      selectionParams.push(new SelectionParam(ogcServer, layers, this.state.projection, extent, oLayer));
    });
    this.state.selection.selectionParameters.push(...selectionParams);
  }

  public async getWmtsCapabilities(url: string): Promise<Record<string, unknown>> {
    if (url in this.wmtsPromisesByServer) {
      // Capabilities are currently loading
      const promise = this.wmtsPromisesByServer[url];
      return promise;
    }

    if (url in this.wmtsCapabilitiesByServer) {
      // Capabilities were already loaded
      const capabilities = this.wmtsCapabilitiesByServer[url];
      return Promise.resolve(capabilities);
    }

    this.wmtsPromisesByServer[url] = (async () => {
      // Capabilities were not loaded yet.
      const response = await fetch(url);
      const result = await response.text();

      // Create new WMTS Layer from Capabilities
      const parser = new WMTSCapabilities();
      const capabilities = parser.read(result) as Record<string, unknown>;
      this.wmtsCapabilitiesByServer[url] = capabilities;
      return capabilities;
    })();

    return this.wmtsPromisesByServer[url];
  }
}

export default WmtsManager;
