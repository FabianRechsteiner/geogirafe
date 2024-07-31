import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import BaseLayer from '../../models/layers/baselayer';
import GroupLayer from '../../models/layers/grouplayer';
import ThemeLayer from '../../models/layers/themelayer';
import LayerManager from '../../tools/layermanager';
import LayerWms from '../../models/layers/layerwms';
import IconSimple from './images/simple.svg';
import IconAdvanced from './images/advanced.svg';
import IconLegend from './images/legend.svg';
import IconExpand from './images/expand.svg';
import IconTrash from './images/trash.svg';

class TreeViewComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  iconGear: string = IconSimple;
  iconGears: string = IconAdvanced;
  iconLegend: string = IconLegend;
  iconExpand: string = IconExpand;
  iconTrash: string = IconTrash;

  layerManager: LayerManager;

  isAllExpanded: boolean = false;
  areAllLegendExpanded: boolean = true;

  constructor() {
    super('treeview');

    this.layerManager = LayerManager.getInstance();
  }

  registerEvents() {
    this.stateManager.subscribe('layers.layersList', (oldLayers, newLayers) =>
      this.onLayersListChanged(oldLayers, newLayers)
    );
    this.stateManager.subscribe('treeview.advanced', () => super.render());
  }

  onLayersListChanged(oldLayers: BaseLayer[], newLayers: BaseLayer[]) {
    super.render();
    // If we added a new group to the list of layers
    // Then we activate the layers that should be activated by default
    let addedLayers = newLayers;
    if (oldLayers) {
      addedLayers = newLayers.filter(
        (newLayer) => !oldLayers.find((oldLayer) => oldLayer.treeItemId === newLayer.treeItemId)
      );
    }
    this.activateDefaultLayers(addedLayers);
  }

  activateDefaultLayers(layers: BaseLayer[]) {
    for (const layer of layers) {
      this.layerManager.activateIfDefaultChecked(layer);
      if (layer instanceof LayerWms) {
        this.layerManager.initializeLegends(layer);
      }
      if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
        this.activateDefaultLayers(layer.children);
      }
    }
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }

  render() {
    super.render();
    this.activateTooltips(false, [800, 0], 'right');
  }

  expandAll() {
    this.isAllExpanded = !this.isAllExpanded;
    this.#expandAllRecursive(this.state.layers.layersList);
    super.render();
  }

  #expandAllRecursive(layers: BaseLayer[]) {
    for (const layer of layers) {
      if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
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

  #toggleAllLegendsRecursive(layers: BaseLayer[]) {
    for (const layer of layers) {
      if (layer instanceof LayerWms && layer.legend) {
        layer.isLegendExpanded = this.areAllLegendExpanded;
      } else if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
        this.#toggleAllLegendsRecursive(layer.children);
      }
    }
  }

  removeAll() {
    for (const layer of this.stateManager.state.layers.layersList) {
      this.layerManager.toggle(layer, 'off');
    }
    this.state.layers.layersList = [];
    this.state.themes.lastSelectedTheme = null;
  }
}

export default TreeViewComponent;
