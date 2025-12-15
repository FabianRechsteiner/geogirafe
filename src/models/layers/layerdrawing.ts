import Layer from './layer';
import VectorLayer from 'ol/layer/Vector';

export default class LayerDrawing extends Layer {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public _oLayer: VectorLayer;

  public constructor(name: string, oLayer: VectorLayer) {
    super(0, name, 0, { isDefaultChecked: true });
    this.isRemovable = false;
    this._oLayer = oLayer;
  }

  public clone(): LayerDrawing {
    throw new Error('Cannot clone vector layer.');
  }
}
