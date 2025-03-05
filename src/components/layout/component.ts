import GirafeHTMLElement from '../../base/GirafeHTMLElement';

type LayoutType = '2D' | '3D' | '2D/3D';
const ALLOWED_LAYOUTS: LayoutType[] = ['2D', '3D', '2D/3D'];

class LayoutComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  visible = false;

  constructor() {
    super('layout');
    this.onLayoutSelect = this.onLayoutSelect.bind(this);
  }

  private registerEvents() {
    this.subscribe('interface.layoutPanelVisible', (_oldValue: boolean, newValue: boolean) =>
      this.togglePanel(newValue)
    );
    this.subscribe('globe.display', (_oldValue: string, newValue: string) => this.onLayoutChanged(newValue));
  }

  private togglePanel(visible: boolean) {
    this.visible = visible;
    this.render();
  }

  private onLayoutSelect(event: Event) {
    const selectedLayout = (event.target as HTMLSelectElement)?.value as LayoutType;
    if (ALLOWED_LAYOUTS.includes(selectedLayout)) {
      this.state.globe.display = selectedLayout;
      return;
    }
    console.error(`${selectedLayout} is not a valid layout!`);
  }

  private onLayoutChanged(globe: string) {
    if (this.visible) {
      const shadowOption = this.shadowRoot?.querySelector('.shadow-option') as HTMLElement;

      if (shadowOption) {
        if (globe === '2D/3D' || globe === '3D') {
          shadowOption.classList.remove('hidden');
        } else {
          shadowOption.classList.add('hidden');
        }
      }
      super.refreshRender();
    }
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.registerEvents();
    });
  }

  render() {
    this.visible ? super.render() : this.hide();
    super.girafeTranslate();
  }
}

export default LayoutComponent;
