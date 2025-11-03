import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import BaseLayer from '../../../models/layers/baselayer';
import GroupLayer from '../../../models/layers/grouplayer';
import ThemeLayer from '../../../models/layers/themelayer';

class MobileGroupElementComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.mobile.css', './style.css'];

  group?: GroupLayer;
  /**
   * Contains all childs recursively flattend for a better view in mobile
   */
  childLayers: BaseLayer[] = [];

  static readonly observedAttributes: string[] = [];

  constructor() {
    super('group-mobile');
  }

  render() {
    super.render();
    this.refreshGroup();
  }

  private refreshGroup() {
    const groupId = this.getAttribute('groupid');
    if (groupId) {
      this.group = this.context.layerManager.getTreeItem(groupId) as GroupLayer;
      if (this.group) {
        this.childLayers = this.context.layerManager.getFlattenedLayerTree(this.group.children).filter((l) => {
          return !(l instanceof ThemeLayer || l instanceof GroupLayer);
        });
      }
    }
    super.refreshRender();
  }

  connectedCallback(): void {
    super.connectedCallback();
    MobileGroupElementComponent.observedAttributes.push('groupid');
    this.render();
  }

  attributeChangedCallback(name: string) {
    if (name === 'groupid') {
      this.refreshGroup();
    }
  }
}

export default MobileGroupElementComponent;
