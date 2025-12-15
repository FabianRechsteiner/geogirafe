import Map from 'ol/Map';
import { getOlayerByName } from '../utils/olutils';
import SimpleMaskLayer from './simplemasklayer';

const MASK_LAYER_NAME = 'SimpleMask';

/**
 * Manager to display a simple mask layer with a cut-out box in the middle.
 */
class SimpleMaskManager {
  private readonly maskLayer = new SimpleMaskLayer({ name: MASK_LAYER_NAME });
  private readonly map: Map;
  private visible: boolean = false;

  public constructor(map: Map) {
    this.map = map;
  }

  /**
   * Display the mask or hide it.
   */
  public setMaskVisibility(visible: boolean) {
    const isLayerInMap = getOlayerByName(this.map, MASK_LAYER_NAME);
    this.visible = visible;
    if (this.visible && !isLayerInMap) {
      this.map.addLayer(this.maskLayer);
      return;
    }
    if (!this.visible && isLayerInMap) {
      this.map.removeLayer(this.maskLayer);
    }
  }

  /**
   * Update the size (width, height), in pixels of the mask.
   */
  public setMaskSize(size: [number, number]) {
    this.maskLayer.updateSize(size);
    this.renderMask();
  }

  private renderMask() {
    if (this.visible) {
      this.maskLayer.changed();
    }
  }
}

export default SimpleMaskManager;
