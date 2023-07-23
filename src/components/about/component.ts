import GirafeDraggableElement from '../../base/GirafeDraggableElement.js';
import StateManager from '../../tools/state/statemanager.js';

class AboutComponent extends GirafeDraggableElement {

  // @ts-ignore
  templateUrl = './template.html';
  // @ts-ignore
  styleUrl = './style.css';

  loaded = false;
  content!: HTMLElement;
  version!: HTMLElement;
  build!: HTMLElement;
  date!: HTMLElement;

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
    (this.stateManager! as StateManager).subscribe(
      'interface.aboutVisible', (_oldValue: boolean, newValue: boolean) => this.toggleAbout(newValue)
    );
  }

  toggleAbout(visible: boolean) {
    // @ts-ignore
    this.content = this.shadow.getElementById('content');
    if (visible) {
      this.loadVersionInfos()
        .then(() => { 
          ((this.content.getRootNode() as ShadowRoot).host as HTMLElement).style.display = 'block';
        });
    }
    else {
      ((this.content.getRootNode() as ShadowRoot).host as HTMLElement).style.display = 'none';
    }
  }

  closeWindow() {
    this.state.interface.aboutVisible = false;
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

customElements.define('girafe-about', AboutComponent as any);

export default AboutComponent;