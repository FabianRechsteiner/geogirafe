import GirafeSingleton from '../../base/GirafeSingleton';
import BaseLayer from '../../models/layers/baselayer';
import GroupLayer from '../../models/layers/grouplayer';
import ThemeLayer from '../../models/layers/themelayer';

type OrderCounter = {
  index: number;
};

export const LayerTreeStartOrder = 1000;

export default class OrderingManager extends GirafeSingleton {
  private timeoutId?: NodeJS.Timeout;

  private get state() {
    return this.context.stateManager.state;
  }

  override initializeSingleton() {
    this.registerEvents();
  }

  private registerEvents() {
    this.context.stateManager.subscribe('layers.layersList', (oldLayers: BaseLayer[], newLayers: BaseLayer[]) =>
      this.onLayerListChanged(oldLayers, newLayers)
    );
    this.context.stateManager.subscribe(
      /layers\.layersList\..*\.children/,
      (oldLayers: BaseLayer[], newLayers: BaseLayer[]) => this.onLayerListChanged(oldLayers, newLayers)
    );
    this.context.stateManager.subscribe(/layers\.layersList\..*\.order/, () => this.reorderLayers());
  }

  private onLayerListChanged(oldLayers: BaseLayer[], newLayers: BaseLayer[]) {
    // Need to reorder only if new layers were added.
    const addedLayers = newLayers.filter(
      (newChild) => !oldLayers.find((oldChild) => oldChild.treeItemId === newChild.treeItemId)
    );
    if (addedLayers.length > 0) {
      this.reorderLayers();
    }
  }

  /**
   * This method do a reorder of all layers present in the treeview
   * in order to keep a order attribut corresponding to what the use wants.
   * This order will be used by the map component to calculate the list of layers in the right order
   */
  private reorderLayers() {
    // Use a debouncing to prevent multiple execution of this method
    // If multiple order attributes are modified at the same time.
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      const orderedLayers = this.getSortedLayers(this.state.layers.layersList);
      const counter: OrderCounter = { index: LayerTreeStartOrder };
      this.context.stateManager.batchChanges(() => this.reorderLayersRecursively(orderedLayers, counter));
    });
  }

  private reorderLayersRecursively(orderedLayers: BaseLayer[], counter: OrderCounter) {
    // Traverse the layertree in depth first to renumber all the elements
    for (const layer of orderedLayers) {
      console.debug(`Setting layer ${layer.name} to order=${counter.index}`);
      layer.order = counter.index++;
      if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
        const orderedChilds = this.getSortedLayers(layer.children);
        this.reorderLayersRecursively(orderedChilds, counter);
      }
    }
  }

  private getSortedLayers(layers: BaseLayer[]): BaseLayer[] {
    const orderedLayers = layers.slice().sort((l1: BaseLayer, l2: BaseLayer) => {
      // Make sure pinned layers are always on top
      if (l1.isPinned && !l2.isPinned) return -1;
      if (!l1.isPinned && l2.isPinned) return 1;
      if (l1.isPinned && l2.isPinned) return 0;
      return l1.order - l2.order;
    });
    return orderedLayers;
  }
}
