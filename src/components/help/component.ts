import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class HelpComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  content!: HTMLElement;

  constructor() {
    super('help');
  }

  render() {
    super.render();
    this.content = this.shadow.querySelector('#content') as HTMLElement;
    if (!this.configManager.Config.basemaps.show) {
      (this.shadow.querySelector('#basemap') as HTMLElement).style.display = 'none';
      (this.shadow.querySelector('#basemap-descr') as HTMLElement).style.display = 'none';
    }
  }

  registerEvents() {
    this.stateManager.subscribe('interface.helpVisible', (_oldValue: boolean, newValue: boolean) =>
      this.toggleHelp(newValue)
    );
    this.content.addEventListener('click', () => {
      this.state.interface.helpVisible = false;
    });
  }

  toggleHelp(visible: boolean) {
    if (visible) {
      this.content.style.display = 'block';
    } else {
      this.content.style.display = 'none';
    }
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }
}

export default HelpComponent;
