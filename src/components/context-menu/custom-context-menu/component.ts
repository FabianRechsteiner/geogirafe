import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import MapManager from '../../../tools/state/mapManager';
import { Map, Overlay } from 'ol';
import MapPosition from '../../../tools/state/mapposition';
import areEqual from '../../../tools/state/brain/equality';

class MapCustomContextMenuComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.css', '../mapcontextmenu.css'];

  private readonly map: Map;
  // We use a static property for the overlay
  // Because OpenLayer is recreating a new object each time when we do an addOverlay()
  private static contextMenuOverlay: Overlay;

  constructor() {
    super('custom-map-context-menu');
    this.map = MapManager.getInstance().getMap();

    if (!MapCustomContextMenuComponent.contextMenuOverlay) {
      MapCustomContextMenuComponent.contextMenuOverlay = new Overlay({
        element: this,
        autoPan: { animation: { duration: 250 } }
      });
      this.map.addOverlay(MapCustomContextMenuComponent.contextMenuOverlay);
    }
  }

  render() {
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

  connectedCallback() {
    this.loadConfig().then(() => {
      this.registerEvents();
    });
  }
}

export default MapCustomContextMenuComponent;
