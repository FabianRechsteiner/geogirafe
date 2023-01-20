import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import TileLayer from 'ol/layer/Tile';

class WmtsManager {
  map = null;

  wmtsCapabilitiesByServer = {};
  wmtsLayers = {};

  constructor(map, srid) {
    this.map = map;
    // TODO REG: use global state for this info, or update when map component is updated.
    this.srid = srid;
  }

  addLayer(url, layername, opacity=1) {
    this.#addLayerInternal(url, layername, opacity, false);
  }

  addBasemapLayer(url, layername, opacity=1) {
    this.#addLayerInternal(url, layername, opacity, true);
  }

  #addLayerInternal(url, layername, opacity, basemap) {
    this.#getWmtsCapabilities(url, (capabilities) => {
      const options = optionsFromCapabilities(capabilities, {
        layer: layername,
        matrixSet: this.srid,
      });

      const olayer = new TileLayer({
        opacity: opacity,
        source: new WMTS(options),
      });

      // Add to map
      if (basemap) {
        const currentBasemap = this.map.getLayers().getArray()[0];
        this.map.removeLayer(currentBasemap);
        this.map.getLayers().insertAt(0, olayer);
      }
      else {
        this.wmtsLayers[layername] = olayer;
        this.map.addLayer(olayer);
      }
    });
  }
  
  removeLayer(layername) {
    if (this.layerExists(layername)) {
      const olayer = this.wmtsLayers[layername];
      delete this.wmtsLayers[layername];
      this.map.removeLayer(olayer);
    }
    else {
      throw 'Cannot remove this layer: it does not exist';
    }
  }
  
  layerExists(layername) {
    return (layername in this.wmtsLayers);
  }

  getLayer(layername) {
    if (this.layerExists(layername)) {
      return this.wmtsLayers[layername];
    }
    return null;
  }

  changeOpacity(layername, opacity) {
    if (this.layerExists(layername)) {
      const olayer = this.wmtsLayers[layername];
      olayer.setOpacity(opacity);
    }
    else {
      throw 'Cannot changeopacity for this layer: it does not exist';
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