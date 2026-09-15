// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import IGirafePanel from '../../tools/state/igirafepanel';

class AboutComponent extends GirafeHTMLElement implements IGirafePanel {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  isPanelVisible = false;
  panelTitle = 'about-panel';
  panelTogglePath = 'interface.aboutPanelVisible';

  loaded = false;
  version!: string;
  build!: string;
  date!: string;

  public constructor() {
    super('about');
  }

  async loadVersionInfos() {
    if (this.loaded) return;

    const response = await fetch('about.json');
    const { version, build, date } = await response.json();
    this.version = version;
    this.build = build;
    this.date = date;
    this.loaded = true;

    this.render();
  }

  public togglePanel(visible: boolean) {
    this.isPanelVisible = visible;
    if (visible) {
      this.loadVersionInfos();
    }
    this.render();
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.render();
  }

  override render() {
    if (this.isPanelVisible) {
      super.render();
    } else {
      this.hide();
    }
    super.girafeTranslate();
  }
}

export default AboutComponent;
