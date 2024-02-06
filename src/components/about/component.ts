import GirafeDraggableElement from '../../base/GirafeDraggableElement';
import GirafeLogo from './images/logo.png';

class AboutComponent extends GirafeDraggableElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  loaded = false;
  version!: HTMLElement;
  build!: HTMLElement;
  date!: HTMLElement;
  logo: string = GirafeLogo;

  constructor() {
    super('about');
  }

  async loadVersionInfos() {
    if (!this.loaded) {
      // Version infos were not loaded yet.
      const response = await fetch('about.json');
      const versionInfos = await response.json();
      this.version = versionInfos.version;
      this.build = versionInfos.build;
      this.date = versionInfos.date;
      this.loaded = true;
      console.log(this.version);
      console.log(this.build);
      console.log(this.date);
    }

    this.render();
  }

  registerEvents() {
    this.stateManager.subscribe('interface.aboutVisible', (_oldValue: boolean, newValue: boolean) =>
      this.toggleAbout(newValue)
    );
  }

  toggleAbout(visible: boolean) {
    if (visible) {
      this.loadVersionInfos().then(() => {
        ((this.shadow.getRootNode() as ShadowRoot).host as HTMLElement).style.display = 'block';
      });
    } else {
      ((this.shadow.getRootNode() as ShadowRoot).host as HTMLElement).style.display = 'none';
    }
  }

  closeWindow() {
    this.state!.interface.aboutVisible = false;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.girafeTranslate();
      this.makeDraggable();
      this.registerEvents();
    });
  }
}

export default AboutComponent;
