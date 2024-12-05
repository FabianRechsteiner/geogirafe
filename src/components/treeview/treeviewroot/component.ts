import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import BaseLayer from '../../../models/layers/baselayer';
import GroupLayer from '../../../models/layers/grouplayer';
import ThemeLayer from '../../../models/layers/themelayer';
import LayerManager from '../../../tools/layermanager';
import LayerWms from '../../../models/layers/layerwms';
import GroupHelper from '../tools/grouphelper';

class TreeViewRootComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../../../styles/common.css'];

  private layerManager: LayerManager;

  private isAllExpanded: boolean = false;
  private areAllLegendExpanded: boolean = true;

  constructor() {
    super('treeviewroot');
    this.layerManager = LayerManager.getInstance();
  }

  public sortedLayers() {
    return GroupHelper.getSortedLayers(this.state.layers.layersList);
  }

  public render() {
    super.render();
    this.activateTooltips(false, [800, 0], 'right');
    this.girafeTranslate();
  }

  private registerEvents() {
    this.subscribe('layers.layersList', (oldLayers, newLayers) => this.onLayersListChanged(oldLayers, newLayers));
    this.subscribe('treeview.advanced', () => this.refreshRender());
    this.subscribe('basemaps', () => this.refreshRender());
    this.subscribe(/layers\.layersList\..*\.order/, () => this.refreshRender());
  }

  private onLayersListChanged(oldLayers: BaseLayer[], newLayers: BaseLayer[]) {
    super.refreshRender();
    // If we added a new group to the list of layers
    // Then we activate the layers that should be activated by default
    let addedLayers = newLayers;
    if (oldLayers) {
      addedLayers = newLayers.filter(
        (newLayer) => !oldLayers.find((oldLayer) => oldLayer.treeItemId === newLayer.treeItemId)
      );
    }
    GroupHelper.activateDefaultLayers(addedLayers);
  }

  protected connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.registerEvents();
    });
  }

  public expandAll() {
    this.isAllExpanded = !this.isAllExpanded;
    this.expandAllRecursive(this.state.layers.layersList);
    super.refreshRender();
  }

  private expandAllRecursive(layers: BaseLayer[]) {
    for (const layer of layers) {
      if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
        layer.isExpanded = this.isAllExpanded;
        this.expandAllRecursive(layer.children);
      }
    }
  }

  public toggleAllLegends() {
    this.areAllLegendExpanded = !this.areAllLegendExpanded;
    this.toggleAllLegendsRecursive(this.state.layers.layersList);
    super.refreshRender();
  }

  private toggleAllLegendsRecursive(layers: BaseLayer[]) {
    for (const layer of layers) {
      if (layer instanceof LayerWms && layer.legend) {
        layer.isLegendExpanded = this.areAllLegendExpanded;
      } else if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
        this.toggleAllLegendsRecursive(layer.children);
      }
    }
  }

  public removeAll() {
    for (const layer of this.stateManager.state.layers.layersList) {
      this.layerManager.toggle(layer, 'off');
    }
    this.state.layers.layersList = [];
    this.state.themes.lastSelectedTheme = null;
  }
}

export default TreeViewRootComponent;
