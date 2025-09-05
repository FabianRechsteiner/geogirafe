import { Map } from 'ol';
import { getRenderPixel } from 'ol/render';
import WmtsManager from './wmtsmanager';
import WmsManager from '../../../tools/wms/wmsmanager';
import { Layer as OLayer } from 'ol/layer';
import { Listener } from 'ol/events';
import RenderEvent from 'ol/render/Event';
import { Size } from 'ol/size';
import BaseEvent from 'ol/events/Event';
import LayerWmts from '../../../models/layers/layerwmts';
import LayerWms from '../../../models/layers/layerwms';
import LayerLocalFile from '../../../models/layers/layerlocalfile';
import LocalFileManager from './localfilemanager';
import Layer from '../../../models/layers/layer';

class SwipeManager {
  map: Map;
  swiper: HTMLInputElement;
  closeButton: HTMLButtonElement;
  swiperEventListeners: Record<
    string,
    {
      olayer: OLayer;
      prerender: Listener;
      postrender: Listener;
    }
  > = {};

  swiperMaxVal: number;

  wmtsManager: WmtsManager;
  wmsManager: WmsManager;
  localFileManager: LocalFileManager;

  constructor(
    map: Map,
    swiper: HTMLInputElement,
    closeButton: HTMLButtonElement,
    wmtsManager: WmtsManager,
    wmsManager: WmsManager,
    localFileManager: LocalFileManager
  ) {
    this.map = map;
    this.swiper = swiper;

    const maxVal = swiper.getAttribute('max');
    if (!maxVal) {
      throw new Error('The Attribute <max> on the swiper is not defined !');
    }
    this.swiperMaxVal = parseInt(maxVal);
    this.wmtsManager = wmtsManager;
    this.wmsManager = wmsManager;
    this.localFileManager = localFileManager;
    this.closeButton = closeButton;
  }

  public toggleSwipe(layer: Layer) {
    if (layer instanceof LayerWms) {
      this.toggleSwipeForWms(layer);
    } else if (layer instanceof LayerWmts) {
      this.toggleSwipeForWmts(layer);
    } else if (layer instanceof LayerLocalFile) {
      this.toggleSwipeForLocalFile(layer);
    }
  }

  private toggleSwipeForWmts(layer: LayerWmts) {
    if (this.wmtsManager.layerExists(layer)) {
      const olayer = this.wmtsManager.getLayer(layer);
      if (olayer) {
        if (layer.swiped === 'no') {
          this.deactivateSwipeForLayer(layer.layer, olayer);
        } else {
          this.activateSwipeForLayer(layer.layer, olayer, layer.swiped);
        }
        return;
      }
    }

    throw new Error('Cannot swipe this layer: it does not exist.');
  }

  private toggleSwipeForLocalFile(layer: LayerLocalFile) {
    if (this.localFileManager.layerExists(layer)) {
      const olayer = this.localFileManager.getLayer(layer);
      if (olayer) {
        if (layer.swiped === 'no') {
          this.deactivateSwipeForLayer(layer.name, olayer);
        } else {
          this.activateSwipeForLayer(layer.name, olayer, layer.swiped);
        }
        return;
      }
    }

    throw new Error('Cannot swipe this layer: it does not exist.');
  }

  private toggleSwipeForWms(layer: LayerWms) {
    if (this.wmsManager.getClient(layer).layerExists(layer)) {
      this.wmsManager.getClient(layer).prepareSwipe(layer);
      const olayer = this.wmsManager.getClient(layer).getOLayer(layer);
      if (olayer) {
        if (layer.swiped === 'no') {
          this.deactivateSwipeForLayer(layer.name, olayer);
        } else {
          this.activateSwipeForLayer(layer.name, olayer, layer.swiped);
        }
        return;
      }
    }

    throw new Error('Layer does not exists. Cannot activate swiper.');
  }

  private showSwiper() {
    this.swiper.style.display = 'block';
    this.closeButton.style.display = 'block';
  }

  private hideSwiper() {
    this.swiper.style.display = 'none';
    this.closeButton.style.display = 'none';
  }

  private activateSwipeForLayer(layername: string, olayer: OLayer, side: 'left' | 'right') {
    // First, remove the old event listener
    if (layername in this.swiperEventListeners) {
      const eventListeners = this.swiperEventListeners[layername];
      olayer.removeEventListener('prerender', eventListeners.prerender);
      olayer.removeEventListener('postrender', eventListeners.postrender);
      delete this.swiperEventListeners[layername];
    }

    // Then add the new listener
    const prerenderHandler = (e: BaseEvent | Event) => this.prerenderSwipe(e as RenderEvent, side);
    const postrenderHandler = (e: BaseEvent | Event) => this.postrenderSwipe(e as RenderEvent);
    this.swiperEventListeners[layername] = {
      olayer: olayer,
      prerender: prerenderHandler,
      postrender: postrenderHandler
    };
    olayer.addEventListener('prerender', prerenderHandler);
    olayer.addEventListener('postrender', postrenderHandler);

    this.showSwiper();
    this.map.render();
  }

  private deactivateSwipeForLayer(layername: string, olayer: OLayer) {
    if (layername in this.swiperEventListeners) {
      const eventListeners = this.swiperEventListeners[layername];
      olayer.removeEventListener('prerender', eventListeners.prerender);
      olayer.removeEventListener('postrender', eventListeners.postrender);
      delete this.swiperEventListeners[layername];
    }

    if (Object.keys(this.swiperEventListeners).length <= 0) {
      this.hideSwiper();
    }

    this.map.render();
  }

  public deactivateSwiper() {
    // Remove all events listeners
    for (const [_key, value] of Object.entries(this.swiperEventListeners)) {
      value.olayer.removeEventListener('prerender', value.prerender);
      value.olayer.removeEventListener('postrender', value.postrender);
    }

    this.hideSwiper();
    this.map.render();
  }

  private prerenderSwipe(event: RenderEvent, side: 'left' | 'right') {
    // TODO REG : This method won't work with WegGL rendering
    const ctx: CanvasRenderingContext2D = event.context as CanvasRenderingContext2D;
    const size = this.map.getSize();
    if (!size) {
      throw new Error('The size of the map is null !');
    }
    const mapSize: Size = size;
    const width: number = mapSize[0] * (parseInt(this.swiper.value) / this.swiperMaxVal);

    let tl = null;
    let tr = null;
    let bl = null;
    let br = null;
    if (side === 'right') {
      // Coordinates for rendering to the right
      tl = getRenderPixel(event, [width, 0]);
      tr = getRenderPixel(event, [mapSize[0], 0]);
      bl = getRenderPixel(event, [width, mapSize[1]]);
      br = getRenderPixel(event, mapSize);
    } else if (side === 'left') {
      // Coordinates for rendering to the left
      tl = getRenderPixel(event, [0, 0]);
      tr = getRenderPixel(event, [width, 0]);
      bl = getRenderPixel(event, [0, mapSize[1]]);
      br = getRenderPixel(event, [width, mapSize[1]]);
    } else {
      throw new Error('Invalid value for parameter side');
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tl[0], tl[1]);
    ctx.lineTo(bl[0], bl[1]);
    ctx.lineTo(br[0], br[1]);
    ctx.lineTo(tr[0], tr[1]);
    ctx.closePath();
    ctx.clip();
  }

  private postrenderSwipe(event: RenderEvent) {
    // TODO REG : This method won't work with WegGL rendering
    const ctx: CanvasRenderingContext2D = event.context as CanvasRenderingContext2D;
    ctx.restore();
  }
}

export default SwipeManager;
