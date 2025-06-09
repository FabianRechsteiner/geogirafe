import BaseLayer from '../../../models/layers/baselayer';
import GroupLayer from '../../../models/layers/grouplayer';
import ThemeLayer from '../../../models/layers/themelayer';
import TreeViewElement from './treeviewelement';

export default abstract class TreeViewGroupElement extends TreeViewElement {
  override layer: GroupLayer | ThemeLayer;

  constructor(layer: GroupLayer | ThemeLayer, name: string) {
    super(layer, name);
    this.layer = layer;
  }

  public sortedChildren() {
    return this.layerManager.getSortedLayers(this.layer.children);
  }

  protected deactivateThemeOrGroup(layer: BaseLayer) {
    layer.activeState = 'off';
    if (layer instanceof ThemeLayer || layer instanceof GroupLayer) {
      for (const child of layer.children) {
        this.deactivateThemeOrGroup(child);
      }
    }
  }

  public toggle() {
    this.stateManager.batchChanges(() => {
      this.layerManager.toggleGroupOrTheme(this.layer);
      this.toggleLayers(this.layer.children, this.layer.activeState as 'on' | 'off');
    });
  }

  private toggleLayers(layers: BaseLayer[], activeState: 'on' | 'off') {
    for (const layer of layers) {
      this.layerManager.toggle(layer, activeState);
      if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
        this.toggleLayers(layer.children, activeState);
      }
    }
  }
}
