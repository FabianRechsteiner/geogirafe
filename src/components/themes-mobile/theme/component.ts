// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import ThemeLayer from '../../../models/layers/themelayer';
import _GroupLayer from '../../../models/layers/grouplayer'; // NOSONAR

class MobileThemeElementComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.mobile.css', './style.css'];

  theme?: ThemeLayer;

  static get observedAttributes() {
    return ['themeid'];
  }

  public constructor() {
    super('theme-mobile');
  }

  render() {
    super.render();
    this.refreshTheme();
  }

  private refreshTheme() {
    const themeId = Number(this.getAttribute('themeid'));
    const theme = this.state.layers.layersList.find((layer) => layer.id === themeId);
    if (theme) {
      this.theme = this.context.layerManager.getTreeItem(theme.treeItemId) as ThemeLayer;
    }
    super.refreshRender();
  }

  protected override connectedCallback(): void {
    super.connectedCallback();
    this.render();
  }

  attributeChangedCallback(name: string) {
    if (name === 'themeid') {
      this.refreshTheme();
    }
  }
}

export default MobileThemeElementComponent;
