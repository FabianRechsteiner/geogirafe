// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import { Overlay } from 'ol';
import MapPosition from '../../../tools/state/mapposition';
import areEqual from '../../../tools/state/brain/equality';

class MapCustomContextMenuComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = [
    './style.css',
    '../../../styles/common.css',
    '../mapcontextmenu.css',
    '../../../../node_modules/ol-ext/overlay/Popup.css'
  ];

  private get map() {
    return this.context.mapManager.getMap();
  }

  // We use a static property for the overlay
  // Because OpenLayer is recreating a new object each time when we do an addOverlay()
  private static contextMenuOverlay: Overlay;

  public constructor() {
    super('custom-map-context-menu');
  }

  override render() {
    if (this.state.position.tooltip) {
      super.render();
      MapCustomContextMenuComponent.contextMenuOverlay.setPosition(this.state.position.tooltip.position);
    } else {
      super.renderEmpty();
    }
  }

  public closeMenu() {
    this.state.position.tooltip = undefined;
    this.render();
  }

  private registerEvents() {
    this.subscribe('position', (oldPos?: MapPosition, newPos?: MapPosition) => {
      if (!areEqual(oldPos?.tooltip, newPos?.tooltip)) {
        this.render();
      }
    });
    this.subscribe('position.tooltip', () => {
      this.render();
    });
  }

  protected override connectedCallback() {
    super.connectedCallback();
    if (!MapCustomContextMenuComponent.contextMenuOverlay) {
      MapCustomContextMenuComponent.contextMenuOverlay = new Overlay({
        element: this,
        autoPan: { animation: { duration: 250 } }
      });
      this.map.addOverlay(MapCustomContextMenuComponent.contextMenuOverlay);
    }

    this.registerEvents();
  }
}

export default MapCustomContextMenuComponent;
