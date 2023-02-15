import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import TileLayer from 'ol/layer/Tile';

class WmtsManager {
  map = null;
  srid = null;

  wmtsCapabilitiesByServer = {};
  wmtsLayers = {};
  basemapLayers = [];

  constructor(map, srid) {
    this.map = map;
    // TODO REG: use global state for this info, or update when map component is updated.
    this.srid = srid;
  }

  removeAllBasemapLayers() {
    this.basemapLayers.forEach((basemap) => {
      this.map.removeLayer(basemap);
    });
    this.basemapLayers = [];
  }

  addLayer(layer) {
    this.#addLayerInternal(layer, false);
  }

  addBasemapLayer(basemap) {
    this.#addLayerInternal(basemap, true);
  }

  #addLayerInternal(layer, isBasemap) {
    this.#getWmtsCapabilities(layer.url, (capabilities) => {
      // TODO REG : Manage dimensions, because the "layers" can be the same with different dimensions
      const options = optionsFromCapabilities(capabilities, {
        layer: layer.layers,
        projection: this.srid
      });

      // Set the right dimensions
      for (let key in layer.dimensions) {
        if (key in options.dimensions) {
          // Update value
          options.dimensions[key] = layer.dimensions[key];
        }
        else {
          console.warn('A dimension ' + key + ' was defined for the WMTS layer ' + layer.layers + ' but the server does not seem to accept it.')
        }
      }

      if (options === null) {
        console.log('Cannot create WMTS layer for layer ' + layer.layers);
      }

      const olayer = new TileLayer({
        opacity: layer.opacity,
        source: new WMTS(options),
      });

      // Add to map
      if (isBasemap) {
        this.basemapLayers.push(olayer);
        this.map.getLayers().insertAt(0, olayer);
      }
      else {
        this.wmtsLayers[layer.layerUniqueId] = olayer;
        this.map.addLayer(olayer);
      }
    });
  }
  
  removeLayer(layer) {
    if (this.layerExists(layer)) {
      const olayer = this.wmtsLayers[layer.layerUniqueId];
      delete this.wmtsLayers[layer.layerUniqueId];
      this.map.removeLayer(olayer);
    }
    else {
      throw 'Cannot remove this layer: it does not exist';
    }
  }
  
  layerExists(layer) {
    return (layer.layerUniqueId in this.wmtsLayers);
  }

  getLayer(layer) {
    if (this.layerExists(layer)) {
      return this.wmtsLayers[layer.layerUniqueId];
    }
    return null;
  }

  changeOpacity(layer, opacity) {
    if (this.layerExists(layer)) {
      const olayer = this.wmtsLayers[layer.layerUniqueId];
      olayer.setOpacity(opacity);
    }
    else {
      throw 'Cannot change opacity for this layer: it does not exist';
    }
  }

  #getWmtsCapabilities(url, callback) {
    if (url in this.wmtsCapabilitiesByServer) {
      // Capabilities were already loaded
      const capabilities = this.wmtsCapabilitiesByServer[url];
      callback(capabilities);
    }
    else {
      // Capabilities were not loaded yet.
      fetch(url)
        .then(response => response.text())
        .then(capabilities => {
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