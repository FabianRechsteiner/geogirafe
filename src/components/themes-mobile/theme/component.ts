import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import ThemeLayer from '../../../models/layers/themelayer';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore This import is not used in the typescript file but needed in the HTML Template
// Cannot use <ts-expect-error> here because after the build-lib, the error disappear
import GroupLayer from '../../../models/layers/grouplayer'; // NOSONAR

class MobileThemeElementComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.mobile.css', './style.css'];

  theme?: ThemeLayer;

  static get observedAttributes() {
    return ['themeid'];
  }

  constructor() {
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

  connectedCallback(): void {
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
