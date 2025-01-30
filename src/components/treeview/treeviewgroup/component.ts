import GroupLayer from '../../../models/layers/grouplayer';
import ThemeLayer from '../../../models/layers/themelayer';
import TreeViewGroupElement from '../tools/treeviewgroupelement';

class TreeViewGroupComponent extends TreeViewGroupElement {
  templateUrl = './template.html';
  styleUrls = ['../style.css', '../../../styles/common.css'];

  override layer: GroupLayer;

  constructor(group: GroupLayer) {
    super(group, 'treeviewgroup');
    this.layer = group;
  }

  render() {
    // If we come from an  html element, the layer was not defined in the constructor
    // And we have to set the layer using the id passed to the layerid attribute
    const groupId = this.getAttribute('groupid');
    if (groupId) {
      this.layer = this.layerManager.getTreeItem(groupId) as GroupLayer;
    }
    super.render();
  }

  registerEvents() {
    this.subscribe(/layers\.layersList\..*\.isExpanded/, (_oldValue: boolean, _newValue: boolean, group: GroupLayer) =>
      this.refreshRender(group)
    );
    this.subscribe(/layers\.layersList\..*\.activeState/, (_oldValue: boolean, _newValue: boolean, group: GroupLayer) =>
      this.refreshRender(group)
    );
    this.subscribe(/layers\.layersList\..*\.children/, (_oldValue: boolean, _newValue: boolean, group: GroupLayer) =>
      this.refreshRender(group)
    );
    this.subscribe(/layers\.layersList\..*\.order/, (_oldValue: boolean, _newValue: boolean, layer: ThemeLayer) => {
      this.refreshRender(layer);
      this.refreshRender(layer.parent);
    });
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }

  deleteGroup() {
    this.deactivateThemeOrGroup(this.layer);
    setTimeout(() => {
      if (this.layer.parent) {
        const index = this.layer.parent.children.findIndex((l) => l === this.layer);
        this.layer.parent.children.splice(index, 1);
      }
    });
  }
}

export default TreeViewGroupComponent;
