import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import Layer from '../../models/layer';
import LayerManager from '../../tools/layermanager';

class TreeViewGroupComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  layerManager: LayerManager;

  group: Layer;

  constructor(group: Layer) {
    super('treeviewgroup');

    this.layerManager = LayerManager.getInstance();
    this.group = group;
  }

  render() {
    // If we come from an  html element, the layer was not defined in the constructor
    // And we have to set the layer using the id passed to the layerid attribute
    const groupId = this.getAttribute('groupid');
    if (groupId) {
      this.group = this.layerManager.getGroup(parseInt(groupId));
    }
    super.render();
    this.activateTooltips(false, [800, 0], 'right');
  }

  registerEvents() {
    this.stateManager.subscribe('layers\.layersList\..*\.isExpanded', (_oldValue:boolean, _newValue:boolean, group:Layer) =>  this.refreshRender(group));
    this.stateManager.subscribe('layers\.layersList\..*\.activeState', (_oldValue:boolean, _newValue:boolean, group:Layer) =>  this.refreshRender(group));
  }

  refreshRender(layer: Layer) {
    if (layer === this.group) {
      super.render()
    }
  }


  toggle(state: 'on' | 'off' | 'semi') {
    this.layerManager.toggleGroup(this.group, state);
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }

  static deactivateGroup(layer: Layer) {
    layer.activeState = 'off';
    for (const child of layer.children) {
      this.deactivateGroup(child);
    }
  }

  deleteGroup() {
    TreeViewGroupComponent.deactivateGroup(this.group);
    const index = this.state.layers.layersList.findIndex((g) => g.id === this.group.id);
    if (index > 0) {
      this.state.layers.layersList.splice(index, 1);
    }
    else {
      // TODO REG : manage subgroup deletion
      console.log('cannot delete this group. Probably a subgroup, this is not managed yet.')
    }
  }
}

customElements.define('girafe-tree-view-group', TreeViewGroupComponent);

export default TreeViewGroupComponent;
