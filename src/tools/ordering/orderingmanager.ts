import GirafeSingleton from '../../base/GirafeSingleton';
import BaseLayer from '../../models/layers/baselayer';
import GroupLayer from '../../models/layers/grouplayer';
import ThemeLayer from '../../models/layers/themelayer';
import StateManager from '../state/statemanager';

type OrderCounter = {
  index: number;
};

export default class OrderingManager extends GirafeSingleton {
  private stateManager: StateManager;

  private timeoutId?: NodeJS.Timeout;

  private get state() {
    return this.stateManager.state;
  }

  constructor(type: string) {
    super(type);
    this.stateManager = StateManager.getInstance();
    this.registerEvents();
  }

  private registerEvents() {
    this.stateManager.subscribe('layers.layersList', () => this.reorderLayers());
    this.stateManager.subscribe(/layers\.layersList\..*\.children/, () => this.reorderLayers());
    this.stateManager.subscribe(/layers\.layersList\..*\.order/, () => this.reorderLayers());
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
      const counter: OrderCounter = { index: 1000 };
      this.reorderLayersRecursively(orderedLayers, counter);
    });
  }

  private reorderLayersRecursively(orderedLayers: BaseLayer[], counter: OrderCounter) {
    // Traverse the layertree in depth first to renumber all the elements
    for (const layer of orderedLayers) {
      console.log(`Setting layer ${layer.name} to order=${counter.index}`);
      layer.order = counter.index++;
      if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
        const orderedChilds = this.getSortedLayers(layer.children);
        this.reorderLayersRecursively(orderedChilds, counter);
      }
    }
  }

  private getSortedLayers(layers: BaseLayer[]): BaseLayer[] {
    const orderedLayers = layers.slice().sort((l1: BaseLayer, l2: BaseLayer) => {
      return l1.order - l2.order;
    });
    return orderedLayers;
  }
}
