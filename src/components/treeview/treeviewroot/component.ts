import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import BaseLayer from '../../../models/layers/baselayer';
import GroupLayer from '../../../models/layers/grouplayer';
import ThemeLayer from '../../../models/layers/themelayer';
import LayerManager from '../../../tools/layers/layermanager';
import LayerWms from '../../../models/layers/layerwms';
import { filterLayerTree } from '../tools/treeviewfilter';

class TreeViewRootComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../../../styles/common.css'];

  private readonly layerManager: LayerManager;

  private isAllExpanded: boolean = false;
  private areAllLegendExpanded: boolean = true;
  public isTreeFiltered: boolean = false;

  constructor() {
    super('treeviewroot');
    this.layerManager = LayerManager.getInstance();
  }

  public sortedLayers() {
    return this.layerManager.getSortedLayers(this.state.layers.layersList);
  }

  public render() {
    super.render();
    this.activateTooltips(false, [800, 0], 'right');
    this.girafeTranslate();
  }

  private registerEvents() {
    this.subscribe('layers.layersList', () => {
      // Whenever tree items are added or removed to the tree, reset the filter
      this.clearFilter();
      this.refreshRender();
    });
    this.subscribe('treeview.advanced', () => this.refreshRender());
    this.subscribe('basemaps', () => this.refreshRender());
    this.subscribe(/layers\.layersList\..*\.order/, () => this.refreshRender());
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

  public filterTree(searchText: string) {
    if (searchText === '') {
      this.clearFilter();
      return;
    }
    // Pause rendering during filtering to improve performance
    this.state.treeview.renderEnabled = false;
    try {
      filterLayerTree(this.state.layers.layersList, searchText);
      this.isTreeFiltered = true;
    } finally {
      this.state.treeview.renderEnabled = true;
      this.refreshRender();
    }
  }

  public clearFilter() {
    // Pause rendering during filtering to improve performance
    this.state.treeview.renderEnabled = false;
    try {
      // Remove search term
      const filterField = this.shadow.getElementById('treeview-search-field') as HTMLInputElement;
      filterField.value = '';

      // Set all layers back to being visible
      const allLayers = LayerManager.getInstance().getFlattenedLayerTree(this.state.layers.layersList);
      allLayers.forEach((layer) => {
        if (!layer.isVisible) {
          layer.isVisible = true;
        }
      });

      this.isTreeFiltered = false;
    } finally {
      this.state.treeview.renderEnabled = true;
      this.refreshRender();
    }
  }
}

export default TreeViewRootComponent;
