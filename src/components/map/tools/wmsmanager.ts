import { Image as ImageLayer, Layer as OLayer } from 'ol/layer';
import ImageWMS from 'ol/source/ImageWMS';
import MessageManager from '../../../tools/messagemanager';
import GeoEvents from '../../../models/events';
import { Map } from 'ol';
import LayerWms from '../../../models/layers/layerwms';

class WmsManager {
  map: Map;
  srid: string;

  messageManager: MessageManager;

  layersByServer: Record<string, { 
    olayer: OLayer, 
    url: string, 
    urlWfs: string | null, 
    layerList: LayerWms[], 
    queryableList: LayerWms[]
  }> = {};
  independentLayers: Record<string, any> = {};
  basemapLayers: ImageLayer<any>[] = [];

  constructor(map: Map, srid: string) {
    this.map = map;
    // TODO REG: use global state for this info, or update when map component is updated.
    this.srid = srid;
    this.messageManager = MessageManager.getInstance();
  }

  removeAllBasemapLayers() {
    this.basemapLayers.forEach((basemap) => {
      this.map.removeLayer(basemap);
    });
    this.basemapLayers = [];
  }

  addLayer(layerInfos: LayerWms) {
    if (layerInfos.isTransparent) {
      const source = this.#createImageWMSSource(layerInfos.url!, [layerInfos], layerInfos.imageType!);
      const layer = new ImageLayer({
        source: source,
        opacity: layerInfos.opacity
      });
      this.independentLayers[layerInfos.name] = layer;
      this.map.addLayer(layer);
    } 
    else if (layerInfos.serverUniqueQueryId !== null && layerInfos.serverUniqueQueryId in this.layersByServer) {
      // Get existing ol layer for this server
      // and add a new wms layer in the source
      const layerDef = this.layersByServer[layerInfos.serverUniqueQueryId];
      layerDef.layerList.push(layerInfos);
      if (layerInfos.queryable) {
        layerDef.queryableList.push(layerInfos);
      }
      const source = this.#createImageWMSSource(layerInfos.url!, layerDef.layerList, layerInfos.imageType!);
      layerDef.olayer.setSource(source);
    }
    else {
      // Create a new ol layer and add it to the right server
      const olayer = new ImageLayer();
      const layerDef = { olayer: olayer, url:layerInfos.url!, urlWfs: layerInfos.urlWfs, layerList: [layerInfos], queryableList: [] as LayerWms[] };
      if (layerInfos.queryable) {
        layerDef.queryableList.push(layerInfos);
      }
      this.layersByServer[layerInfos.serverUniqueQueryId!] = layerDef;
      const source = this.#createImageWMSSource(layerInfos.url!, layerDef.layerList, layerInfos.imageType!);
      olayer.setSource(source);
      this.map.addLayer(olayer);
    }

    // If the layer is transparent, we make it transparent
    if (layerInfos.isTransparent) {
      //this.onChangeOpacity(layerInfos);
    }
  }

  #createImageWMSSource(url: string, layerList: LayerWms[], imageType: string) {
    const orderedLayers = layerList.slice().sort((l1: LayerWms, l2: LayerWms) => { return l2.order - l1.order });
    const orderedLayerNames = orderedLayers.map((l: LayerWms) => l.layers);
    const source = new ImageWMS({
      url: url,
      params: {
        'LAYERS': orderedLayerNames,
        'FORMAT': imageType
      }
    });
    return source;
  }

  addBasemapLayer(layerInfos: LayerWms) {
    const source = this.#createImageWMSSource(layerInfos.url!, [layerInfos], layerInfos.imageType!);
    const olayer = new ImageLayer({
      source: source,
      opacity: layerInfos.opacity
    });
    this.basemapLayers.push(olayer);
    this.map.getLayers().insertAt(0, olayer);
  }

  removeLayer(layerInfos: LayerWms) {
    if (this.layerExists(layerInfos)) {
        if (layerInfos.name in this.independentLayers) {
          const layerDef = this.independentLayers[layerInfos.name];
          delete this.independentLayers[layerInfos.name];
          this.map.removeLayer(layerDef);
        }
        else if (layerInfos.serverUniqueQueryId !== null && layerInfos.serverUniqueQueryId in this.layersByServer) {
          // Get existing ol layer for this server
          // and add a new wms layer in the source
          const layerDef = this.layersByServer[layerInfos.serverUniqueQueryId];
          layerDef.layerList = layerDef.layerList.filter((item: { id: any; }) => item.id !== layerInfos.id);
    
          if (layerDef.layerList.length > 0) {
            // There are still layers in the list.
            // => We update the layer source
            const source = this.#createImageWMSSource(layerInfos.url!, layerDef.layerList, layerInfos.imageType!);
            layerDef.olayer.setSource(source);
          }
          else {
            // No more layer here.
            // => We simply remove the whole layer
            delete this.layersByServer[layerInfos.serverUniqueQueryId];
            this.map.removeLayer(layerDef.olayer);
          }
        }
        else {
          console.log('Nothing to remove !');
        }
    }
    else {
      // TODO : this is called on layertree init, investigate why
      console.error(`Cannot remove WMS-Layer ${layerInfos.name} from the map: it does not exist!`);
    }
  }

  layerExists(layerInfos: LayerWms) {
    if (layerInfos.name in this.independentLayers) {
      return true;
    }
    if (layerInfos.serverUniqueQueryId !== null && layerInfos.serverUniqueQueryId in this.layersByServer) {
      const layerDef = this.layersByServer[layerInfos.serverUniqueQueryId];
      const layer = layerDef.layerList.find((item: { treeItemId: any; }) => item.treeItemId === layerInfos.treeItemId);
      return (layer !== undefined);
    }
    return false;
  }

  getLayer(layerInfos: LayerWms) {
    if (layerInfos.name in this.independentLayers) {
      return this.independentLayers[layerInfos.name];
    }
    if (layerInfos.serverUniqueQueryId !== null && layerInfos.serverUniqueQueryId in this.layersByServer) {
      const layerDef = this.layersByServer[layerInfos.serverUniqueQueryId];
      return layerDef.olayer;
    }
    return null;
  }

  changeOpacity(layerInfos: LayerWms) {
    if (this.layerExists(layerInfos)) {
        if (!layerInfos.isTransparent) {
          // Back to normal
          // The opacity was set to 1 again.
          if (layerInfos.name in this.independentLayers) {
            const layerDef = this.independentLayers[layerInfos.name];
            // We delete the layer from the transparent layers
            delete this.independentLayers[layerInfos.name];
            this.map.removeLayer(layerDef);
            // And add it to the normal layer again
            this.addLayer(layerInfos);
          }
          else {
            // Nothing to do.
            console.log('Nothing to do here');
          }
        }
        else if (layerInfos.name in this.independentLayers) {
          // The layer has already a configured opacity
          // => We just change the opacity
          const layerDef = this.independentLayers[layerInfos.name];
          layerDef.setOpacity(layerInfos.opacity);
        }
        else if (layerInfos.serverUniqueQueryId !== null && layerInfos.serverUniqueQueryId in this.layersByServer) {
          this.makeLayerIndependent(layerInfos);
        }
        else {
          // Nothing to do
          console.log('Nothing to do!');
        }
      
    }
    else {
      throw new Error('Cannot change opacity for this layer: it does not exist');
    }
  }

  makeLayerIndependent(layerInfos: LayerWms) {
    if (layerInfos.name in this.independentLayers) {
      // The layer is already independent.
      // => nothing to do here.
    }
    else if (layerInfos.serverUniqueQueryId !== null && layerInfos.serverUniqueQueryId in this.layersByServer) {
      // First, we remove the layer from the default layer
      this.removeLayer(layerInfos);
      // Then, we create a new layer
      const source = this.#createImageWMSSource(layerInfos.url!, [layerInfos], layerInfos.imageType!);
      const layer = new ImageLayer({
        source: source,
        opacity: layerInfos.opacity
      });
      this.independentLayers[layerInfos.name] = layer;
      this.map.addLayer(layer);
    }
    else {
      throw new Error('A layer can be made independent only if it has already been added to the map.');
    }
  }

  selectFeatures(extent: number[]) {
    const selectionParams = [];

    for (let key in this.layersByServer) {
      const layer = this.layersByServer[key];
      const queryLayers = layer.queryableList.map((l: LayerWms) => l.queryLayers!.split(',')).flat(1);

      selectionParams.push({
        wfsUrl: layer.urlWfs,
        selectionBox: extent,
        srid: this.srid,
        featureTypes: queryLayers
      });
    }

    this.messageManager.sendMessage({ action: GeoEvents.selectFeatures, selectionParams: selectionParams });
  }
}

export default WmsManager;
