import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class AboutComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  visible = false;
  loaded = false;
  version!: string;
  build!: string;
  date!: string;

  constructor() {
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

  private registerEvents() {
    this.subscribe('interface.aboutPanelVisible', (_oldValue: boolean, newValue: boolean) =>
      this.togglePanel(newValue)
    );
  }

  private togglePanel(visible: boolean) {
    this.visible = visible;
    if (visible) {
      this.loadVersionInfos();
    }
    this.render();
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.registerEvents();
    });
  }

  render() {
    if (this.visible) {
      super.render();
    } else {
      this.hide();
    }
    super.girafeTranslate();
  }
}

export default AboutComponent;
