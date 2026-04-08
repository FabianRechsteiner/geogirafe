// SPDX-License-Identifier: Apache-2.0
import ThemeLayer from '../../../models/layers/themelayer';
import TreeViewGroupElement from '../tools/treeviewgroupelement';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore This import is not used in the typescript file but needed in the HTML Template
// Cannot use <ts-expect-error> here because after the build-lib, the error disappear
import GroupLayer from '../../../models/layers/grouplayer';

class TreeViewThemeComponent extends TreeViewGroupElement {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.css', '../style.css', './style.css'];

  override layer: ThemeLayer;

  public constructor(theme: ThemeLayer) {
    super(theme, 'treeviewtheme');
    this.layer = theme;
  }

  override render() {
    // If we come from an  html element, the layer was not defined in the constructor
    // And we have to set the layer using the id passed to the layerid attribute
    const themeId = this.getAttribute('themeid');
    if (themeId) {
      this.layer = this.context.layerManager.getTreeItem(themeId) as ThemeLayer;
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
    this.subscribe(/layers\.layersList\..*\.children/, (_oldValue: boolean, _newValue: boolean, group: GroupLayer) =>
      this.refreshRender(group)
    );
    this.subscribe(/layers\.layersList\..*\.filter/, (_oldValue: boolean, _newValue: boolean, layer: ThemeLayer) =>
      this.refreshRender(layer)
    );
    this.subscribe(/layers\.layersList\..*\.order/, (_oldValue: boolean, _newValue: boolean, layer: ThemeLayer) => {
      this.refreshRender(layer);
      this.refreshRender(layer.parent);
    });
    this.subscribe('treeview.renderEnabled', () => {
      this.refreshRender();
    });
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.render();
    super.girafeTranslate();
    this.registerEvents();
  }

  public deleteTheme() {
    this.deactivateThemeOrGroup(this.layer);
    this.removeFromParent();
    this.state.themes.lastSelectedTheme = null;
  }
}

export default TreeViewThemeComponent;
