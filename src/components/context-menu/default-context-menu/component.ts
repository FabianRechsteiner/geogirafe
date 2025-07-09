import type { Callback } from '../../../tools/state/statemanager';
import { render } from 'uhtml';

import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import I18nManager from '../../../tools/i18n/i18nmanager';
import MapManager from '../../../tools/state/mapManager';
import { printCoordinate } from '../../../tools/geometrytools';
import { Map, Overlay } from 'ol';
import { MapContextMenuState } from './contextmenustate';
import { MapContextMenuManager } from './contextmenumanager';

class MapDefaultContextMenuComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../../../styles/common.css', '../mapcontextmenu.css'];

  private readonly map: Map;
  private readonly eventsCallbacks: Callback[] = [];
  MapContextMenuState: MapContextMenuState;
  MapContextMenuManager: MapContextMenuManager;
  i18nManager: I18nManager;
  private contextMenuOverlay?: Overlay;
  host: HTMLDivElement;
  printCoordinate = printCoordinate;

  constructor() {
    super('map-context-menu');
    this.i18nManager = I18nManager.getInstance();
    this.state.extendedState.mapcontextmenu = new MapContextMenuState();
    this.MapContextMenuState = this.state.extendedState.mapcontextmenu as MapContextMenuState;
    this.MapContextMenuManager = new MapContextMenuManager(this.MapContextMenuState);
    this.map = MapManager.getInstance().getMap();
    this.host = document.createElement('div');
  }

  async updateData() {
    // Important update projection before position
    this.MapContextMenuManager.projection = this.state.projection;
    this.MapContextMenuManager.position = this.state.mouseCoordinates as [number, number];
  }

  async renderContent() {
    render<HTMLDivElement>(this.host, this.template);
    await this.i18nManager.translate(this.host as unknown as DocumentFragment);
  }

  showContextMenu(): void {
    this.registerEvents();
    if (!this.contextMenuOverlay) {
      this.renderContent();
      this.contextMenuOverlay = new Overlay({
        element: this.host,
        autoPan: { animation: { duration: 250 } }
      });
      this.map.addOverlay(this.contextMenuOverlay);
    } else {
      this.renderContent();
    }
    this.contextMenuOverlay.setPosition(this.MapContextMenuState.position);
  }

  closeMenu(): void {
    this.MapContextMenuState.visible = false;
    this.unregisterEvents();
  }

  hideContextMenu(): void {
    if (this.contextMenuOverlay) {
      this.contextMenuOverlay.setPosition(undefined);
    }
  }

  registerVisibilityEvents(): void {
    this.subscribe(/extendedState\.mapcontextmenu\.visible/, async (_oldVal: boolean, _newVal: boolean) => {
      console.debug(`mapcontextmenu visible changed from: ${_oldVal} to: ${_newVal}`);
      if (_newVal === false) {
        this.hideContextMenu();
      } else {
        this.showContextMenu();
      }
    });
  }

  registerEvents(): void {
    this.eventsCallbacks.push(
      this.subscribe(/extendedState\.mapcontextmenu\.sources\..*\.loading/, (_oldVal: boolean, _newVal: boolean) => {
        console.debug(`mapcontextmenu sources loading changed from: ${_oldVal} to: ${_newVal}`);
        this.renderContent();
      }),
      this.subscribe('language', (_oldVal: string, _newVal: string) => {
        console.debug(`Language changed from: ${_oldVal} to: ${_newVal}`);
        if (this.contextMenuOverlay) {
          this.renderContent();
        }
      })
    );
  }

  registerInteractions(): void {
    // Right click on map event
    if (this.registerInteractionListener('map.contextmenu', false)) {
      this.map.getViewport().addEventListener('contextmenu', async (e) => {
        if (this.canExecute('map.contextmenu')) {
          e.preventDefault();
          this.MapContextMenuState.visible = false;
          await this.updateData();
          this.MapContextMenuState.visible = true;
        }
      });
    }
  }

  unregisterEvents(): void {
    this.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;
  }

  async connectedCallback() {
    console.log('connected callback - context menu');
    await this.loadConfig();
    this.registerVisibilityEvents();
    this.registerInteractions();
  }
}

export default MapDefaultContextMenuComponent;
