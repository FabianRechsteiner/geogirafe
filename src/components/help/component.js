import GirafeHTMLElement from '../../base/GirafeHTMLElement.js';

class HelpComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  content = null;

  constructor() {
    super('help');
  }

  render() {
    super.render();
    this.content = this.shadow.querySelector('#content');
    if (!this.configManager.Config.basemaps.show) {
      this.shadow.querySelector('#basemap').style.display = 'none';
      this.shadow.querySelector('#basemap-descr').style.display = 'none';
    }
  }

  registerEvents() {
    this.stateManager.subscribe('interface.helpVisible', (oldValue, newValue) => this.toggleHelp(newValue));
    this.content.addEventListener('click', () => { this.state.interface.helpVisible = false });
  }

  toggleHelp(visible) {
    if (visible) {
      this.content.style.display = 'block';
    }
    else {
      this.content.style.display = 'none';
    }
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.translate();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-help', HelpComponent);

export default HelpComponent;
