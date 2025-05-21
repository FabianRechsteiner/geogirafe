import type { Callback } from '../../tools/state/statemanager';

import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import MapManager from '../../tools/state/mapManager';
import ConfigManager from '../../tools/configuration/configmanager';
import { Map, Overlay } from 'ol';
import { RasterManager } from './rasterquerymanager';
import { MapContextMenuState } from './contextmenustate';

class ContextMenuContainer extends HTMLElement {
  container!: HTMLElement;
}

class MapContextMenuComponent extends GirafeHTMLElement {
  templateUrl = null;
  styleUrls = null;

  private readonly map: Map;
  private readonly eventsCallbacks: Callback[] = [];
  readonly MapContextMenuState: MapContextMenuState;
  private readonly rasterQueryManager: RasterManager;

  constructor() {
    super('map-context-menu');
    this.state.extendedState.mapcontextmenu = new MapContextMenuState();
    this.MapContextMenuState = this.state.extendedState.mapcontextmenu as MapContextMenuState;
    this.MapContextMenuState.crs = ConfigManager.getInstance().Config.contextmenu.crs;
    this.map = MapManager.getInstance().getMap();
    this.rasterQueryManager = new RasterManager(this.MapContextMenuState);
  }

  async updateData() {
    this.MapContextMenuState.position = this.state.mouseCoordinates as [number, number];
    this.MapContextMenuState.projection = this.state.projection;

    this.rasterQueryManager.refresh(this.MapContextMenuState.projection, this.MapContextMenuState.position);
  }

  showContextMenu(id: string, position: [number, number], containerElement: string): void {
    let contextMenuOverlay = this.map.getOverlayById(id);

    // Remove existing overlay
    if (contextMenuOverlay) {
      this.map.removeOverlay(contextMenuOverlay);
    }

    // Create new overlay
    const contextMenuContainer = document.createElement(containerElement) as ContextMenuContainer;
    contextMenuContainer.container = this;

    contextMenuOverlay = new Overlay({
      id: id,
      element: contextMenuContainer,
      position: position,
      autoPan: {
        animation: {
          duration: 250
        }
      }
    });
    this.map.addOverlay(contextMenuOverlay);
  }

  hideContextMenu(id: string): void {
    const contextMenuOverlay = this.map.getOverlayById(id);
    if (contextMenuOverlay) {
      contextMenuOverlay.setPosition(undefined);
    }
  }

  registerEvents() {
    // Right click on map event
    if (this.registerInteractionListener('map.contextmenu', false)) {
      this.map.getViewport().addEventListener('contextmenu', async (e) => {
        if (this.canExecute('map.contextmenu')) {
          e.preventDefault();
          await this.updateData();
          this.showContextMenu(
            'default-overlay',
            this.MapContextMenuState.position!,
            'girafe-default-context-menu-content'
          );
        }
      });
    }

    // Map rendering complete event
    this.map.once('rendercomplete', () => {
      if (this.state.position.tooltip) {
        this.showContextMenu(
          'custom-overlay',
          this.state.position.center as [number, number],
          'girafe-custom-context-menu-content'
        );
      }
    });
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
