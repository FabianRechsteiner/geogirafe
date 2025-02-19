import GirafeDraggableElement from '../../base/GirafeDraggableElement';

class InfoWindowComponent extends GirafeDraggableElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  constructor() {
    super('infowindow');

    window.gOpenWindow = (
      title: string,
      url: string,
      width?: string | number,
      height?: string | number,
      top?: string | number,
      left?: string | number
    ): void => {
      // Update state to trigger rendering
      this.state.infoWindow = {
        title: title,
        url: url,
        width: width ?? null,
        height: height ?? null,
        top: top ?? null,
        left: left ?? null
      };
      this.state.interface.infoWindowVisible = true;
    };
  }

  registerEvents() {
    this.subscribe('interface.infoWindowVisible', (_oldValue: boolean, isVisible: boolean) => {
      if (isVisible) {
        this.render();
      } else {
        this.renderEmpty();
      }
    });

    this.subscribe(/infoWindow.*/, () => {
      if (this.state.interface.infoWindowVisible) this.render();
    });
  }

  render() {
    const windowConfig = this.configManager.Config.infoWindow;
    const host = (this.shadow.getRootNode() as ShadowRoot).host as HTMLElement;
    host.style.width = this.configToCssValue(this.state.infoWindow.width) ?? windowConfig.defaultWindowWidth;
    host.style.height = this.configToCssValue(this.state.infoWindow.height) ?? windowConfig.defaultWindowHeight;
    host.style.top = this.configToCssValue(this.state.infoWindow.top) ?? windowConfig.defaultWindowPositionTop;
    host.style.left = this.configToCssValue(this.state.infoWindow.left) ?? windowConfig.defaultWindowPositionLeft;

    super.render();
    this.girafeTranslate();
    this.makeDraggable();
  }

  closeWindow() {
    this.state.interface.infoWindowVisible = false;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.girafeTranslate();
      this.makeDraggable();
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
