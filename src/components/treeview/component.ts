import GirafeResizableElement from '../../base/GirafeResizableElement'
import Layer from '../../models/layer';
import LayerManager from '../../tools/layermanager';

class TreeViewComponent extends GirafeResizableElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  layerManager: LayerManager;

  hideLegendWhenLayerIsDeactivated: boolean = false;
  previousLegendState: Record<number, boolean> = {};
  isAllExpanded: boolean = false;
  areAllLegendExpanded: boolean = true;

  get isSwiperVisible() {
    return (this.state.layers.swipedLayers.left.length > 0 || this.state.layers.swipedLayers.right.length > 0);
  }

  constructor() {
    super('treeview');

    this.layerManager = LayerManager.getInstance();

    this.configManager.loadConfig().then(() => { 
      if (this.configManager.Config.treeview.hideLegendWhenLayerIsDeactivated) {
        this.hideLegendWhenLayerIsDeactivated = true;
      }
    });
  }

  registerEvents() {
    this.stateManager.subscribe('selectedTheme', () => this.onThemeChanged());
    this.stateManager.subscribe('layers\.layersList', () => super.render());
    this.stateManager.subscribe('layers\.swipedLayers', () => super.render());
    this.stateManager.subscribe('treeview\.advanced', () =>  super.render());
    this.stateManager.subscribe('layers\.layersList\..*\.activeState', (_oldValue: boolean, _newValue: boolean, layer: Layer) => this.activateStateChanged(layer));
  }

  onThemeChanged() {
    if (this.state.selectedTheme != null) {
      this.state.layers.layersList = [...this.state.selectedTheme.layersTree];
    }
    else {
      this.state.layers.layersList = [];
    }
  }

  connectedCallback() {
    this.loadConfig()
      .then(() => {
        this.render();
        super.girafeTranslate();
        this.registerEvents();
      });
  }

  render() {
    super.render();
    this.activateTooltips(false, [800, 0], 'right');
  }

  activateStateChanged(layer: Layer) {
    // Hide the legend when the layer is deactivated (if configured so)
    if (layer.isLayer && this.hideLegendWhenLayerIsDeactivated) {
      if (layer.active) {
        if (layer.id in this.previousLegendState) {
          // If there is not previous state, we change nothing to the legend state
          layer.isLegendExpanded = this.previousLegendState[layer.id];
        }
      }
      else { 
        this.previousLegendState[layer.id] = layer.isLegendExpanded;
        layer.isLegendExpanded = false;
      }
    }
  }

  expandAll() {
    this.isAllExpanded = !this.isAllExpanded;
    this.#expandAllRecursive(this.state.layers.layersList);
    super.render();
  }

  #expandAllRecursive(layers: Layer[]) {
    for (const layer of layers) {
      if (layer.isGroup) {
        layer.isExpanded = this.isAllExpanded;
        this.#expandAllRecursive(layer.children);
      }
    }
  }

  toggleAllLegends() {
    this.areAllLegendExpanded = !this.areAllLegendExpanded;
    this.#toggleAllLegendsRecursive(this.state.layers.layersList);
    super.render();
  }

  #toggleAllLegendsRecursive(layers: Layer[]) {
    for (const layer of layers) {
      if (layer.isLayer && layer.legend) {
        layer.isLegendExpanded = this.areAllLegendExpanded;
      }
      else if (layer.isGroup) {
        this.#toggleAllLegendsRecursive(layer.children);
      }
    }
  }

  removeAll() {
    for (const layer of this.stateManager.state.layers.layersList) {
      this.layerManager.toggle(layer, 'off');
    }
    this.hideSwipe();
    this.state.layers.layersList = [];
    this.state.selectedTheme = null;
  }

  hideSwipe() {
    this.state.layers.swipedLayers = { left:[], right:[] };
    super.render();
  }
}

customElements.define('girafe-tree-view', TreeViewComponent);

export default TreeViewComponent;
