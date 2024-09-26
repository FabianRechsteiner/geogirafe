import GirafeDraggableElement from '../../base/GirafeDraggableElement';

class MetadataWindowComponent extends GirafeDraggableElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  private initialized = false;

  constructor() {
    super('metadatawindow');
  }

  registerEvents() {
    this.subscribe('interface.metadataVisible', (_oldValue: boolean, newValue: boolean) =>
      this.toggleMetadata(newValue)
    );

    this.subscribe(/metadata.*/, () => this.render());
  }

  render() {
    if (!this.initialized) {
      const host = (this.shadow.getRootNode() as ShadowRoot).host as HTMLElement;
      host.style.width = this.configManager.Config.metadata.defaultWindowWidth;
      host.style.height = this.configManager.Config.metadata.defaultWindowHeight;
      this.initialized = true;
    }
    super.render();
    this.girafeTranslate();
    this.makeDraggable();
  }

  toggleMetadata(visible: boolean) {
    if (visible) {
      this.render();
    } else {
      this.renderEmpty();
    }
  }

  closeWindow() {
    this.state.interface.metadataVisible = false;
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

export default MetadataWindowComponent;
