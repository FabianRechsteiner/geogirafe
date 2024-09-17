import BaseLayer from '../../../models/layers/baselayer';
import ThemeLayer from '../../../models/layers/themelayer';
import TreeViewGroupElement from '../tools/treeviewgroupelement';
// @ts-ignore This import is not used in the typescript file but needed in the HTML Template
// Cannot use <ts-expect-error> here because after the build-lib, the error disappear
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import GroupLayer from '../../../models/layers/grouplayer';

class TreeViewThemeComponent extends TreeViewGroupElement {
  templateUrl = './template.html';
  styleUrls = ['../style.css', '../../../styles/common.css'];

  override layer: ThemeLayer;

  constructor(theme: ThemeLayer) {
    super(theme, 'treeviewtheme');
    this.layer = theme;
  }

  render() {
    // If we come from an  html element, the layer was not defined in the constructor
    // And we have to set the layer using the id passed to the layerid attribute
    const themeId = this.getAttribute('themeid');
    if (themeId) {
      this.layer = this.layerManager.getTreeItem(themeId) as ThemeLayer;
    }
    super.render();
  }

  registerEvents() {
    this.subscribe(/layers\.layersList\..*\.isExpanded/, (_oldValue: boolean, _newValue: boolean, theme: ThemeLayer) =>
      this.refreshRender(theme)
    );
    this.subscribe(/layers\.layersList\..*\.activeState/, (_oldValue: boolean, _newValue: boolean, theme: ThemeLayer) =>
      this.refreshRender(theme)
    );
    this.subscribe(
      /layers\.layersList\..*\.children/,
      (oldChildren: BaseLayer[], newChildren: BaseLayer[], theme: ThemeLayer) =>
        this.onChildrenListChanged(oldChildren, newChildren, theme)
    );
    this.subscribe(/layers\.layersList\..*\.filter/, (_oldValue: boolean, _newValue: boolean, layer: ThemeLayer) =>
      this.refreshRender(layer)
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

  deleteTheme() {
    this.deactivateThemeOrGroup(this.layer);
    setTimeout(() => {
      const index = this.state.layers.layersList.findIndex((l) => l === this.layer);
      this.state.layers.layersList.splice(index, 1);
      this.state.themes.lastSelectedTheme = null;
    });
  }
}

export default TreeViewThemeComponent;
