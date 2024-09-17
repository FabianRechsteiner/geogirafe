import BaseLayer from '../../../models/layers/baselayer';
import StateManager from '../../../tools/state/statemanager';

class DragHelper {
  static checkParents(dragged: BaseLayer, dropped: BaseLayer) {
    if (dragged.parent !== dropped.parent) {
      throw Error('Layers can only be reordered if the have the same parent');
    }
  }

  static reorderLayers(
    dragged: BaseLayer,
    dropped: BaseLayer,
    adjustOrder: (childOrder: number, draggedOrder: number) => boolean,
    increment: number
  ) {
    DragHelper.checkParents(dragged, dropped);
    dragged.order = dropped.order;

    const layersToReorder = dragged.parent
      ? dragged.parent.children
      : StateManager.getInstance().state.layers.layersList;

    for (const child of layersToReorder) {
      if (child.treeItemId !== dragged.treeItemId && adjustOrder(child.order, dragged.order)) {
        child.order += increment;
      }
    }
  }

  static moveLayerAfter(dragged: BaseLayer, dropped: BaseLayer) {
    const minOrder = dragged.order;
    DragHelper.reorderLayers(
      dragged,
      dropped,
      (childOrder, draggedOrder) => childOrder <= draggedOrder && childOrder >= minOrder,
      -1
    );
  }

  static moveLayerBefore(dragged: BaseLayer, dropped: BaseLayer) {
    const maxOrder = dragged.order;
    DragHelper.reorderLayers(
      dragged,
      dropped,
      (childOrder, draggedOrder) => childOrder >= draggedOrder && childOrder <= maxOrder,
      1
    );
  }
}

export default DragHelper;
