import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import BaseLayer from '../../../models/layers/baselayer';
import DragManager from './dragmanager';
import { isTimeAwareLayer, TimeAwareLayer } from '../../../models/layers/timeawarelayer';
import { isSnappableLayer } from '../../../models/layers/snappablelayer';
import tippy from 'tippy.js';
import TimeRestrictionComponent from '../../timerestriction/component';
import LayerWms from '../../../models/layers/layerwms';
import Layer from '../../../models/layers/layer';

export default abstract class TreeViewElement extends GirafeHTMLElement {
  private dragManager!: DragManager;
  protected layer: BaseLayer;

  private dragButton!: HTMLButtonElement;
  private container!: HTMLElement;

  constructor(layer: BaseLayer, name: string) {
    super(name);
    this.layer = layer;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.dragManager = this.context.dragManager;
  }

  public render() {
    super.render();
    this.dragButton = this.shadow.getElementById('drag-button') as HTMLButtonElement;
    this.container = this.shadow.getElementById('container') as HTMLElement;

    super.girafeTranslate();
    this.initializeDrag();

    if (isTimeAwareLayer(this.layer)) {
      this.createTimeRestrictionTooltip(this.layer);
    }
  }

  public refreshRender(): void;
  public refreshRender(layer?: BaseLayer): void;
  public refreshRender(layer?: BaseLayer): void {
    if (this.state.treeview.renderEnabled && (!layer || layer === this.layer)) {
      // Is called without param, call refresh
      // Else, call refresh only if the layer in param is the current one
      super.refreshRender();
      super.girafeTranslate();
    }
  }

  protected showMetadata() {
    window.gOpenWindow(this.layer.name, this.layer.metadataUrl!);
  }

  protected initializeDrag() {
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

  public getButtonClass(button: string) {
    const buttonClasses = 'gg-icon-button gg-small gg-opacity tool';
    const activeButtonClasses = buttonClasses + ' active';
    switch (button) {
      case 'swipedLeft':
        if (!this.layer.inactive && this.layer instanceof Layer) {
          return this.layer.swiped === 'left' ? activeButtonClasses : buttonClasses;
        }
        return 'hidden';
      case 'swipedRight':
        if (!this.layer.inactive && this.layer instanceof Layer) {
          return this.layer.swiped === 'right' ? activeButtonClasses : buttonClasses;
        }
        return 'hidden';
      case 'opacity':
        if (!this.layer.inactive && this.layer instanceof Layer) {
          return this.layer.opacity < 1 ? activeButtonClasses : buttonClasses;
        }
        return 'hidden';
      case 'filter':
        if (!this.layer.inactive && this.layer instanceof LayerWms && this.layer.queryable) {
          return this.layer.hasFilter ? activeButtonClasses : buttonClasses;
        }
        return 'hidden';
      case 'timeRestriction':
        if (!this.layer.inactive && isTimeAwareLayer(this.layer)) {
          return this.layer.hasTimeRestriction ? activeButtonClasses : buttonClasses;
        }
        return 'hidden';
      case 'snappable':
        if (!this.layer.inactive && isSnappableLayer(this.layer)) {
          return this.layer.snapActive ? activeButtonClasses : buttonClasses;
        }
        return 'hidden';
      default:
        throw Error('Unsupported type: ' + button);
    }
  }

  protected createTimeRestrictionTooltip(layer: TimeAwareLayer) {
    const el = this.shadow.getElementById('timeRestriction');
    if (!el) return;
    tippy(el, {
      trigger: 'click',
      arrow: true,
      interactive: true,
      theme: 'light',
      placement: 'bottom',
      appendTo: document.body,
      content: (_reference: object) => {
        return new TimeRestrictionComponent(layer);
      }
    });
  }

  protected removeFromParent() {
    if (this.layer.parent) {
      const index = this.layer.parent.children.findIndex((l) => l === this.layer);
      if (index >= 0) {
        this.layer.parent.children.splice(index, 1);
      }
    } else {
      const index = this.state.layers.layersList.findIndex((l) => l === this.layer);
      if (index >= 0) {
        this.state.layers.layersList.splice(index, 1);
      }
    }
  }
}
