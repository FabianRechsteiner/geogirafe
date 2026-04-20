// SPDX-License-Identifier: Apache-2.0
import BaseLayer from '../../../models/layers/baselayer';
import DragHelper from './draghelper';
import GirafeSingleton from '../../../base/GirafeSingleton';

class DragManager extends GirafeSingleton {
  private layer?: BaseLayer;
  private destination?: BaseLayer;
  public dragAfter: boolean = false;
  public dragBefore: boolean = false;
  private readonly dragHelper: DragHelper = new DragHelper(this.context.stateManager);

  public dragStart(layer: BaseLayer) {
    this.layer = layer;
  }

  public dragEnd() {
    if (this.layer && this.destination && this.layer.parent === this.destination.parent) {
      if (this.layer.order < this.destination.order) {
        this.dragHelper.moveLayerAfter(this.layer, this.destination);
      } else if (this.layer.order > this.destination.order) {
        this.dragHelper.moveLayerBefore(this.layer, this.destination);
      } else {
        throw Error('Orders are equal. Not managed yet');
      }
      this.layer = undefined;
      this.destination = undefined;
    } else {
      // Just do nothing, this move is not possible.
      console.debug('Illegal drag&drop');
    }
  }

  public dragEnter(target: BaseLayer): boolean {
    if (this.layer && this.layer !== target && this.layer?.parent === target.parent) {
      // Same parent, but different item
      this.destination = target;
      if (this.layer.order > target.order) {
        this.dragBefore = true;
      } else {
        this.dragAfter = true;
      }
      return true;
    }
    return false;
  }

  public dragLeave(target: BaseLayer): boolean {
    if (this.layer?.treeItemId !== target.treeItemId && this.layer?.parent?.treeItemId === target.parent?.treeItemId) {
      this.dragAfter = false;
      this.dragBefore = false;
      return true;
    }
    return false;
  }
}

export default DragManager;
