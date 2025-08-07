import GirafeDraggableElement from '../../base/GirafeDraggableElement';
import ResizeWindow from '../../tools/resizewindow';

class InfoWindowComponent extends GirafeDraggableElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', '../../styles/resizable.css', './style.css'];

  visible: boolean = false;
  private resizeWindow: ResizeWindow | null = null;

  constructor() {
    super('infowindow');

    // Initialize floating window
    window.gOpenWindow = (
      title: string,
      url: string,
      width?: string | number,
      height?: string | number,
      top?: string | number,
      left?: string | number
    ): void => {
      // Update infoWindow state
      this.state.infoWindow.title = title;
      this.state.infoWindow.url = url;
      this.state.infoWindow.width = width ?? null;
      this.state.infoWindow.height = height ?? null;
      this.state.infoWindow.top = top ?? null;
      this.state.infoWindow.left = left ?? null;
      // Trigger window to appear
      this.state.interface.infoWindowVisible = true;
    };

    this.updateWindowSizeAndPosition();
  }

  registerEvents() {
    this.subscribe('interface.infoWindowVisible', (_oldValue: boolean, isVisible: boolean) => {
      this.visible = isVisible;
      this.render();
    });

    this.subscribe(/infoWindow\.(width|height|top|left)/, (oldValue, newValue) => {
      if (oldValue !== newValue) {
        this.updateWindowSizeAndPosition();
        this.render();
      }
    });
    this.subscribe(/infoWindow\.(url|title)/, () => this.render());
  }

  render() {
    if (this.visible) {
      this.renderComponent();
    } else {
      this.renderEmptyComponent();
    }
  }

  renderComponent() {
    super.render();
    this.girafeTranslate();
    this.resizeWindow = new ResizeWindow(this.shadow);
    this.makeDraggable();
  }

  private renderEmptyComponent() {
    this.resizeWindow?.destroy();
    this.resizeWindow = null;
    this.renderEmpty();
  }

  private updateWindowSizeAndPosition() {
    const windowConfig = this.configManager.Config.infoWindow;
    const host = (this.shadow.getRootNode() as ShadowRoot).host as HTMLElement;
    host.style.width = this.configToCssValue(this.state.infoWindow.width) ?? windowConfig.defaultWindowWidth;
    host.style.height = this.configToCssValue(this.state.infoWindow.height) ?? windowConfig.defaultWindowHeight;
    host.style.top = this.configToCssValue(this.state.infoWindow.top) ?? windowConfig.defaultWindowPositionTop;
    host.style.left = this.configToCssValue(this.state.infoWindow.left) ?? windowConfig.defaultWindowPositionLeft;
  }

  closeWindow() {
    this.state.interface.infoWindowVisible = false;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.registerEvents();
    });
  }

  private configToCssValue(value: string | number | null): string | null {
    if (typeof value === 'number' && value > 0) return value + 'px';
    if (typeof value === 'string') {
      value = value.replace(' ', '');
      if (Number(value) && Number(value) > 0) return value + 'px';
      // Check for a valid CSS
      const matches = value.match(/^\d.*(px|em|rem|%)$/g);
      return matches && matches.length === 1 ? value : null;
    }
    return null;
  }
}

export default InfoWindowComponent;
