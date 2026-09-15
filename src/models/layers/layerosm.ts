// SPDX-License-Identifier: Apache-2.0
import Layer from './layer';
import LayerConsts from './layerconsts';

class LayerOsm extends Layer {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public constructor(order: number) {
    super(LayerConsts.LayerOsmId, 'OpenStreetMap', order);
  }

  public clone() {
    const clonedObject = new LayerOsm(this.order);
    clonedObject.activeState = this.activeState;
    return clonedObject;
  }
}

export default LayerOsm;
