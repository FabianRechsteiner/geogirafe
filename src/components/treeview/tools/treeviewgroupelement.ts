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

  public toggle(state?: 'on' | 'off' | 'semi') {
    this.layerManager.toggleGroupOrTheme(this.layer, state);
  }
}
