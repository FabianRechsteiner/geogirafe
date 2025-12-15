import BaseLayer from '../../../models/layers/baselayer';
import StateManager from '../../../tools/state/statemanager';

class DragHelper {
  private readonly stateManager: StateManager;

  public constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  private checkParents(dragged: BaseLayer, dropped: BaseLayer) {
    if (dragged.parent !== dropped.parent) {
      throw Error('Layers can only be reordered if the have the same parent');
    }
  }

  private reorderLayers(
    dragged: BaseLayer,
    dropped: BaseLayer,
    adjustOrder: (childOrder: number, draggedOrder: number) => boolean,
    increment: number
  ) {
    this.checkParents(dragged, dropped);
    dragged.order = dropped.order;

    const layersToReorder = dragged.parent ? dragged.parent.children : this.stateManager.state.layers.layersList;

    for (const child of layersToReorder) {
      if (child.treeItemId !== dragged.treeItemId && adjustOrder(child.order, dragged.order)) {
        child.order += increment;
      }
    }
  }

  public moveLayerAfter(dragged: BaseLayer, dropped: BaseLayer) {
    const minOrder = dragged.order;
    this.reorderLayers(
      dragged,
      dropped,
      (childOrder, draggedOrder) => childOrder <= draggedOrder && childOrder >= minOrder,
      -1
    );
  }

  public moveLayerBefore(dragged: BaseLayer, dropped: BaseLayer) {
    const maxOrder = dragged.order;
    this.reorderLayers(
      dragged,
      dropped,
      (childOrder, draggedOrder) => childOrder >= draggedOrder && childOrder <= maxOrder,
      1
    );
  }
}

export default DragHelper;
