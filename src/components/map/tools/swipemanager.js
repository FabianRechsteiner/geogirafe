import {getRenderPixel} from 'ol/render';

class SwipeManager {
  map = null;
  swiper = null;
  swiperEventListeners = {};
  swiperMaxVal = null;

  wmtsManager = null;
  wmsManager = null;

  constructor(map, swiper, wmtsManager, wmsManager) {
    this.map = map;
    this.swiper = swiper;
    this.swiperMaxVal = parseInt(swiper.getAttribute('max'));
    this.wmtsManager = wmtsManager;
    this.wmsManager = wmsManager;
  }

  activateSwipeForWmts(layer, side) {
    if (this.wmtsManager.layerExists(layer)) {
      const olayer = this.wmtsManager.getLayer(layer);
      this.activateSwipeForLayer(layer.layers, olayer, side);
    }
    else {
      throw 'Cannot swipe this layer: it does not exist.';
    }
  }

  activateSwipeForWms(layerInfos, side) {
    if (this.wmsManager.layerExists(layerInfos)) {
      this.wmsManager.makeLayerIndependant(layerInfos);
      const olayer = this.wmsManager.getLayer(layerInfos);
      this.activateSwipeForLayer(layerInfos.name, olayer, side);
    }
    else {
      // Nothing to do
      throw 'Layer does not exists. Cannot activate swiper.';
    }
  }
  
  #setSwiperVisible() {
    this.swiper.style.display = 'block';
  }

  #hideSwiper() {
    this.swiper.style.display = 'none';
  }
  
  /*deactivateSwipeForWms(layerInfos) {
    if (layerInfos.name in this.swipedLayers) {
      // Back to normal
      const layerDef = this.swipedLayers[layerInfos.name];
      // We delete the layer from the transparent layers
      delete this.swipedLayers[layerInfos.name];
      this.map.removeLayer(layerDef);
      // And add it to the normal layer again
      this.onAddWmsLayer(layerInfos);
    
    }
  }*/

  activateSwipeForLayer(layername, olayer, side) {
    // First, remove the old event listener
    if (layername in this.swiperEventListeners) {
      const eventListeners = this.swiperEventListeners[layername];
      olayer.removeEventListener('prerender', eventListeners.prerender)
      olayer.removeEventListener('postrender', eventListeners.postrender)
      delete this.swiperEventListeners[layername];
    }

    // Then add the new listener
    const prerenderHandler = (e) => this.#prerenderSwipe(e, side);
    const postrenderHandler = (e) => this.#postrenderSwipe(e);
    this.swiperEventListeners[layername] = {
      olayer: olayer,
      prerender: prerenderHandler,
      postrender: postrenderHandler
    };
    olayer.addEventListener('prerender', prerenderHandler);
    olayer.addEventListener('postrender', postrenderHandler);

    this.#setSwiperVisible();
    this.map.render();
  }

  deactivateSwipe() {
    // Remove all events listeners
    for (const [key, value] of Object.entries(this.swiperEventListeners)) {
      value.olayer.removeEventListener('prerender', value.prerender);
      value.olayer.removeEventListener('postrender', value.postrender);
    }

    this.#hideSwiper();
    this.map.render();
  }

  #prerenderSwipe(event, side) {
    const ctx = event.context;
    const mapSize = this.map.getSize();
    const width = mapSize[0] * (this.swiper.value / this.swiperMaxVal);

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
    }
    else if (side === 'left') {
      // Coordinates for rendering to the left
      tl = getRenderPixel(event, [0, 0]);
      tr = getRenderPixel(event, [width, 0]);
      bl = getRenderPixel(event, [0, mapSize[1]]);
      br = getRenderPixel(event, [width, mapSize[1]]);
    }
    else {
      throw 'Invalid value for parameter side';
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

  #postrenderSwipe(event) {
    const ctx = event.context;
    ctx.restore();
  }
}

export default SwipeManager;