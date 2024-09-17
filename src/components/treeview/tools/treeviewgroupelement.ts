import BaseLayer from '../../../models/layers/baselayer';
import GroupLayer from '../../../models/layers/grouplayer';
import ThemeLayer from '../../../models/layers/themelayer';
import GroupHelper from './grouphelper';
import TreeViewElement from './treeviewelement';

export default abstract class TreeViewGroupElement extends TreeViewElement {
  declare layer: GroupLayer | ThemeLayer;

  constructor(layer: GroupLayer | ThemeLayer, name: string) {
    super(layer, name);
  }

  public sortedChildren() {
    return GroupHelper.getSortedLayers(this.layer.children);
  }

  protected deactivateThemeOrGroup(layer: BaseLayer) {
    layer.activeState = 'off';
    if (layer instanceof ThemeLayer || layer instanceof GroupLayer) {
      for (const child of layer.children) {
        this.deactivateThemeOrGroup(child);
      }
    }
  }

  protected onChildrenListChanged(oldChildren: BaseLayer[], newChildren: BaseLayer[], theme: GroupLayer | ThemeLayer) {
    this.refreshRender(theme);
    // If we added a new group to the list of layers
    // Then we activate the layers that should be activated by default
    const addedLayers = newChildren.filter(
      (newChild) => !oldChildren.find((oldChild) => oldChild.treeItemId === newChild.treeItemId)
    );
    GroupHelper.activateDefaultLayers(addedLayers);
  }

  public toggle(state?: 'on' | 'off' | 'semi') {
    this.layerManager.toggleGroupOrTheme(this.layer, state);
  }
}
