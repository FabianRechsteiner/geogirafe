import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import BaseLayer from '../../models/layers/baselayer';
import GroupLayer from '../../models/layers/grouplayer';
import LayerManager from '../../tools/layermanager';
import ThemeLayer from '../../models/layers/themelayer';

class TreeViewGroupComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  layerManager: LayerManager;

  group: GroupLayer;

  constructor(group: GroupLayer) {
    super('treeviewgroup');

    this.layerManager = LayerManager.getInstance();
    this.group = group;
  }

  render() {
    // If we come from an  html element, the layer was not defined in the constructor
    // And we have to set the layer using the id passed to the layerid attribute
    const groupId = this.getAttribute('groupid');
    if (groupId) {
      this.group = this.layerManager.getTreeItem(groupId) as GroupLayer;
    }
    super.render();
    this.activateTooltips(false, [800, 0], 'right');
  }

  registerEvents() {
    this.stateManager.subscribe(
      /layers\.layersList\..*\.isExpanded/,
      (_oldValue: boolean, _newValue: boolean, group: GroupLayer) => this.refreshRender(group)
    );
    this.stateManager.subscribe(
      /layers\.layersList\..*\.activeState/,
      (_oldValue: boolean, _newValue: boolean, group: GroupLayer) => this.refreshRender(group)
    );
    this.stateManager.subscribe(
      /layers\.layersList\..*\.children/,
      (oldChildren: BaseLayer[], newChildren: BaseLayer[], group: GroupLayer) =>
        this.onChildrenListChanged(oldChildren, newChildren, group)
    );
  }

  refreshRender(group: GroupLayer) {
    if (group === this.group) {
      super.render();
    }
  }

  onChildrenListChanged(oldChildren: BaseLayer[], newChildren: BaseLayer[], group: GroupLayer) {
    this.refreshRender(group);
    // If we added a new group to the list of layers
    // Then we activate the layers that should be activated by default
    const addedLayers = newChildren.filter(
      (newChild) => !oldChildren.find((oldChild) => oldChild.treeItemId === newChild.treeItemId)
    );
    this.activateDefaultLayers(addedLayers);
  }

  activateDefaultLayers(layers: BaseLayer[]) {
    for (const layer of layers) {
      this.layerManager.activateIfDefaultChecked(layer);
      if (layer instanceof GroupLayer) {
        this.activateDefaultLayers(layer.children);
      }
    }
  }

  toggle(state?: 'on' | 'off' | 'semi') {
    this.layerManager.toggleGroupOrTheme(this.group, state);
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }

  deactivateGroup(layer: BaseLayer) {
    layer.activeState = 'off';
    if (layer instanceof GroupLayer) {
      for (const child of layer.children) {
        this.deactivateGroup(child);
      }
    }
  }

  showMetadata() {
    this.state.metadata = {
      title: this.group.name,
      url: this.group.metadataUrl ?? null
    };
    this.state.interface.metadataVisible = true;
  }

  deleteGroup() {
    this.deactivateGroup(this.group);
    if (!this.deleteGroupRecursive(this.state.layers.layersList)) {
      // Group could not be deleted. Why ?
      throw new Error(`The group {this.group.name} could not be deleted.`);
    }
  }

  private deleteGroupRecursive(layersList: BaseLayer[]): boolean {
    const index = layersList.findIndex((g) => g.id === this.group.id);
    if (index >= 0) {
      layersList.splice(index, 1);
      return true;
    } else {
      for (const layer of layersList) {
        if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
          if (this.deleteGroupRecursive(layer.children)) {
            return true;
          }
        }
      }
      return false;
    }
  }
}

export default TreeViewGroupComponent;
