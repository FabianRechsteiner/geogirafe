// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import BaseLayer from '../../../models/layers/baselayer';
import DragManager from './dragmanager';
import { isTimeAwareLayer, TimeAwareLayer } from '../../../models/layers/timeawarelayer';
import { isSnappableLayer } from '../../../models/layers/snappablelayer';
import tippy from 'tippy.js';
import TimeRestrictionComponent from '../../timerestriction/component';
import LayerWms from '../../../models/layers/layerwms';
import Layer from '../../../models/layers/layer';
import State from '../../../tools/state/state';

export default abstract class TreeViewElement extends GirafeHTMLElement {
  private dragManager!: DragManager;
  protected layer: BaseLayer;

  private dragButton!: HTMLButtonElement;
  private container!: HTMLElement;
  private header!: HTMLElement;

  public constructor(layer: BaseLayer, name: string) {
    super(name);
    this.layer = layer;
  }

  protected override connectedCallback(): void {
    super.connectedCallback();
    this.dragManager = this.context.dragManager;
  }

  public render() {
    super.render();
    this.dragButton = this.shadow.getElementById('drag-button') as HTMLButtonElement;
    this.container = this.shadow.getElementById('container') as HTMLElement;
    this.header = this.shadow.querySelector('header') as HTMLElement;

    super.girafeTranslate();
    this.initializeDrag();

    if (isTimeAwareLayer(this.layer)) {
      this.createTimeRestrictionTooltip(this.layer);
    }

    this.subscribe(/layers\.layersList\..*\.isHighlighted/, (_oldValue: boolean, newValue: boolean, layer: Layer) => {
      if (newValue && layer === this.layer) {
        this.highlight();
      }
    });
  }

  private highlight() {
    this.header.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
    this.header.classList.add('highlight');
    setTimeout(() => {
      this.header.classList.remove('highlight');
      this.layer.isHighlighted = false;
    }, 3000);
  }

  public refreshRender(): void;
  public refreshRender(layer?: BaseLayer): void;
  public refreshRender(layer?: BaseLayer): void {
    if (this.state.treeview.renderEnabled && (!layer || layer === this.layer)) {
      // Is called without param, call refresh
      // Else, call refresh only if the layer in param is the current one
      super.refreshRender();
      super.girafeTranslate();

      if (this.layer.isHighlighted) {
        this.highlight();
      }
    }
  }

  protected showMetadata() {
    window.gOpenWindow(this.layer.name, this.layer.metadataUrl!);
  }

  protected initializeDrag() {
    if (!this.layer.isDraggable) {
      return;
    }
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
        if (this.layer.isSwipeable && !this.layer.inactive && this.layer instanceof Layer) {
          return this.layer.swiped === 'left' ? activeButtonClasses : buttonClasses;
        }
        return 'hidden';
      case 'swipedRight':
        if (this.layer.isSwipeable && !this.layer.inactive && this.layer instanceof Layer) {
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
      case 'draggable':
        if (this.layer.isDraggable) {
          return 'gg-icon-button gg-small gg-grab gg-opacity tool';
        }
        return 'hidden';
      case 'removable':
        if (this.layer.isRemovable) {
          return 'gg-icon-button gg-small remove gg-opacity tool';
        } else {
          return 'hidden';
        }
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
    TreeViewElement.removeLayerFromParent(this.layer, this.state);
  }

  private static removeLayerFromParent(layer: BaseLayer, state: State) {
    if (layer.parent) {
      const index = layer.parent.children.indexOf(layer);
      if (index >= 0) {
        layer.parent.children.splice(index, 1);
      }
      if (layer.parent.children.length === 0) {
        TreeViewElement.removeLayerFromParent(layer.parent, state);
      }
    } else {
      const index = state.layers.layersList.indexOf(layer);
      if (index >= 0) {
        state.layers.layersList.splice(index, 1);
      }
    }
  }
}
