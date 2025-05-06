import type { Callback } from '../../tools/state/statemanager';
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import MapManager from '../../tools/state/mapManager';
import ConfigManager from '../../tools/configuration/configmanager';
import { Map, Overlay } from 'ol';
import { RasterManager } from './rasterquerymanager';
import { MapContextMenuState } from './contextmenustate';

class MapContextMenuComponent extends GirafeHTMLElement {
  templateUrl = null;
  styleUrls = null;

  private readonly map: Map;
  private readonly eventsCallbacks: Callback[] = [];
  private readonly MapContextMenuState: MapContextMenuState;
  private readonly rasterQueryManager: RasterManager;
  private contextMenuContainer!: HTMLElement;
  private contextMenuOverlay!: Overlay;

  constructor() {
    super('map-context-menu');
    this.state.extendedState.mapcontextmenu = new MapContextMenuState();
    this.MapContextMenuState = this.state.extendedState.mapcontextmenu as MapContextMenuState;

    this.MapContextMenuState.crs = ConfigManager.getInstance().Config.contextmenu.crs;
    this.map = MapManager.getInstance().getMap();
    this.rasterQueryManager = new RasterManager();
  }

  async updateData() {
    this.MapContextMenuState.position = this.state.mouseCoordinates as [number, number];
    this.MapContextMenuState.projection = this.state.projection;

    this.rasterQueryManager.refresh(this.MapContextMenuState.projection, this.MapContextMenuState.position);
  }

  showContextMenu(): void {
    this.updateData();

    // Remove existing overlay
    if (this.contextMenuOverlay) {
      this.map.removeOverlay(this.contextMenuOverlay);
    }

    // Create new overlay
    this.contextMenuContainer = document.createElement('girafe-context-menu-content');

    this.contextMenuOverlay = new Overlay({
      element: this.contextMenuContainer,
      position: this.MapContextMenuState.position!,
      autoPan: {
        animation: {
          duration: 250
        }
      }
    });
    this.map.addOverlay(this.contextMenuOverlay);
  }

  hideContextMenu(): void {
    if (this.contextMenuOverlay) {
      this.contextMenuOverlay.setPosition(undefined);
    }
  }

  registerEvents() {
    // Right click on map event
    if (this.registerInteractionListener('map.contextmenu', false)) {
      this.map.getViewport().addEventListener('contextmenu', (e) => {
        if (this.canExecute('map.contextmenu')) {
          e.preventDefault();
          this.showContextMenu();
        }
      });
    }

    this.eventsCallbacks.push(
      this.subscribe(
        'extendedState.mapcontextmenu.position',
        (_oldValue: [number, number], _newValue: [number, number]) => {
          console.debug(`extendedState.mapcontextmenu.position: ${this.MapContextMenuState.position}`);
          this.state.interface.contextMenuVisible = true;
        }
      ),

      this.subscribe('interface.contextMenuVisible', (_oldValue: boolean, _newValue: boolean) => {
        console.debug(`contextMenuVisible: ${this.state.interface.contextMenuVisible}`);

        if (_newValue) {
          this.showContextMenu();
        } else {
          this.hideContextMenu();
        }
      })
    );
  }

  unregisterEvents(): void {
    this.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;
  }

  async connectedCallback() {
    await this.loadConfig();
    this.registerEvents();
  }
}

export default MapContextMenuComponent;
