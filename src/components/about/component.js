import GirafeDraggableElement from '../../base/GirafeDraggableElement.js';

class AboutComponent extends GirafeDraggableElement {

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
      this.version.innerHTML = versionInfos.version;
      this.build.innerHTML = versionInfos.build;
      this.date.innerHTML = versionInfos.date;
      this.loaded = true;
    }
  }

  render() {
    super.render();
    this.content = this.shadow.getElementById('content');
    this.version = this.shadow.getElementById('version');
    this.build = this.shadow.getElementById('build');
    this.date = this.shadow.getElementById('date');
  }

  registerEvents() {
    this.stateManager.subscribe('interface.aboutVisible', (oldValue, newValue) => this.toggleAbout(newValue));
  }

  toggleAbout(visible) {
    if (visible) {
      this.loadVersionInfos()
        .then(() => { this.content.getRootNode().host.style.display = 'block'; });
    }
    else {
      this.content.getRootNode().host.style.display = 'none';
    }
  }

  closeWindow() {
    this.state.interface.aboutVisible = false;
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      super.translate();
      this.makeDraggable();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-about', AboutComponent);

export default AboutComponent;