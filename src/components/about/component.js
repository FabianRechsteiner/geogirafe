import GirafeDraggableElement from '../../base/GirafeDraggableElement.js';

class AboutComponent extends GirafeDraggableElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  loaded = false;
  content = null;
  version = null;
  build = null;
  date = null;

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
    this.stateManager.subscribe('interface.aboutVisible', (oldValue, newValue) => this.toggleAbout(newValue));
  }

  toggleAbout(visible) {
    this.content = this.shadow.getElementById('content');
    if (visible) {
      this.loadVersionInfos()
        .then(() => { 
          this.content.getRootNode().host.style.display = 'block';
        });
    }
    else {
      this.content.getRootNode().host.style.display = 'none';
    }
  }

  closeWindow() {
    this.state.interface.aboutVisible = false;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.translate();
      this.makeDraggable();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-about', AboutComponent);

export default AboutComponent;