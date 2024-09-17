import BaseLayer from '../../../models/layers/baselayer';
import StateManager from '../../../tools/state/statemanager';

class DragHelper {
  static checkParents(dragged: BaseLayer, dropped: BaseLayer) {
    if (dragged.parent !== dropped.parent) {
      throw Error('Layers can only be reordered if the have the same parent');
    }
  }

  static moveLayerAfter(dragged: BaseLayer, dropped: BaseLayer) {
    DragHelper.checkParents(dragged, dropped);
    const minOrder = dragged.order;
    dragged.order = dropped.order;

    const layersToReorder = dragged.parent
      ? dragged.parent.children
      : StateManager.getInstance().state.layers.layersList;
    for (const child of layersToReorder) {
      if (child.treeItemId != dragged.treeItemId && child.order <= dragged.order && child.order >= minOrder) {
        child.order--;
      }
    }
  }

  static moveLayerBefore(dragged: BaseLayer, dropped: BaseLayer) {
    DragHelper.checkParents(dragged, dropped);
    const maxOrder = dragged.order;
    dragged.order = dropped.order;

    const layersToReorder = dragged.parent
      ? dragged.parent.children
      : StateManager.getInstance().state.layers.layersList;
    for (const child of layersToReorder) {
      if (child.treeItemId != dragged.treeItemId && child.order >= dragged.order && child.order <= maxOrder) {
        child.order++;
      }
    }
  }
}

export default DragHelper;
