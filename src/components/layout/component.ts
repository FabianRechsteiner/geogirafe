import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class LayoutComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = '../../styles/common.css';

  public currentLayoutIcon: string = 'icons/layout-3d.svg';

  constructor() {
    super('layout');
  }

  registerEvents() {
    this.stateManager.subscribe('globe.display', () => this.onLayoutChanged());
  }

  private onLayoutChanged() {
    switch (this.state.globe.display) {
      case 'none':
        this.currentLayoutIcon = 'icons/layout-3d.svg';
        break;
      case 'side':
        this.currentLayoutIcon = 'icons/layout-3d.svg';
        break;
      case 'full':
        this.currentLayoutIcon = 'icons/layout-2d.svg';
        break;
      default:
        throw Error('Invalid value for layout.');
    }
    super.refreshRender();
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.registerEvents();
      super.girafeTranslate();
    });
  }
}

export default LayoutComponent;
