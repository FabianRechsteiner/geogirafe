import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import BaseLayer from '../../../models/layers/baselayer';
import LayerManager from '../../../tools/layermanager';
import DragManager from './dragmanager';

export default abstract class TreeViewElement extends GirafeHTMLElement {
  private dragManager: DragManager;
  protected layerManager: LayerManager;
  protected layer: BaseLayer;

  private dragButton!: HTMLButtonElement;
  private container!: HTMLElement;

  constructor(layer: BaseLayer, name: string) {
    super(name);
    this.layer = layer;
    this.layerManager = LayerManager.getInstance();
    this.dragManager = DragManager.getInstance();
  }

  public render() {
    super.render();
    this.dragButton = this.shadow.getElementById('drag-button') as HTMLButtonElement;
    this.container = this.shadow.getElementById('container') as HTMLElement;

    super.girafeTranslate();
    this.initializeDrag();
    this.createTooltips();
  }

  public refreshRender(): void;
  public refreshRender(layer?: BaseLayer): void;
  public refreshRender(layer?: BaseLayer): void {
    if (!layer || layer === this.layer) {
      // Is called without param, call refresh
      // Else, call refresh only if the layer in param is the current one
      super.refreshRender();
      this.createTooltips();
    }
  }

  private createTooltips() {
    super.activateTooltips(false, [800, 0], 'top');
  }

  protected showMetadata() {
    this.state.metadata = {
      title: this.layer.name,
      url: this.layer.metadataUrl ?? null
    };
    this.state.interface.metadataVisible = true;
  }

  private initializeDrag() {
    this.dragButton.draggable = true;
    this.dragButton.ondragstart = (e: DragEvent) => this.dragStart(e);
    this.dragButton.ondragend = (e: DragEvent) => this.dragEnd(e);
    this.ondragenter = (e: DragEvent) => this.dragEnter(e);
    this.ondragleave = (e: DragEvent) => this.dragLeave(e);
  }

  private dragStart(event: DragEvent) {
    this.dragManager.dragStart(this.layer);
    event.dataTransfer!.setDragImage(this, this.offsetWidth, 0);
  }

  private dragEnd(_event: DragEvent) {
    this.dragManager.dragEnd();
  }

  private dragEnter(_event: DragEvent) {
    if (this.dragManager.dragEnter(this.layer)) {
      this.setDragStyle();
    }
  }

  private dragLeave(_event: DragEvent) {
    if (this.dragManager.dragLeave(this.layer)) {
      this.setDragStyle();
    }
  }

  private setDragStyle() {
    if (this.dragManager.dragAfter) {
      this.container.classList.remove('dragBefore');
      this.container.classList.add('dragAfter');
    } else if (this.dragManager.dragBefore) {
      this.container.classList.remove('dragAfter');
      this.container.classList.add('dragBefore');
    } else {
      this.container.classList.remove('dragAfter');
      this.container.classList.remove('dragBefore');
    }
  }
}
