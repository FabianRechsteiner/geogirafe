import type { Callback } from '../../../tools/state/statemanager';
import { render } from 'uhtml';

import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import { printCoordinate } from '../../../tools/geometrytools';
import { Overlay } from 'ol';
import { MapContextMenuState } from './contextmenustate';
import MapContextMenuManager from './contextmenumanager';

class MapDefaultContextMenuComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../../../styles/common.css', '../mapcontextmenu.css'];

  private get map() {
    return this.context.mapManager.getMap();
  }

  private readonly eventsCallbacks: Callback[] = [];
  protected mapContextMenuState!: MapContextMenuState;
  protected mapContextMenuManager!: MapContextMenuManager;
  private contextMenuOverlay?: Overlay;
  host: HTMLDivElement;
  printCoordinate = printCoordinate;

  constructor() {
    super('map-context-menu');
    this.host = document.createElement('div');
  }

  async updateData() {
    // Important update projection before position
    this.mapContextMenuManager.projection = this.state.projection;
    this.mapContextMenuManager.position = this.state.mouseCoordinates as [number, number];
  }

  async renderContent() {
    render<HTMLDivElement>(this.host, this.template);
    await this.context.i18nManager.translate(this.host as unknown as DocumentFragment);
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
    this.contextMenuOverlay.setPosition(this.mapContextMenuState.position);
  }

  closeMenu(): void {
    this.mapContextMenuState.visible = false;
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
          this.mapContextMenuState.visible = false;
          await this.updateData();
          this.mapContextMenuState.visible = true;
        }
      });
    }
  }

  unregisterEvents(): void {
    this.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    this.state.extendedState.mapcontextmenu = new MapContextMenuState();
    this.mapContextMenuState = this.state.extendedState.mapcontextmenu as MapContextMenuState;
    this.mapContextMenuManager = new MapContextMenuManager(this.mapContextMenuState, this.context);

    this.mapContextMenuManager.initialize().then(() => {
      this.registerVisibilityEvents();
      this.registerInteractions();
    });
  }
}

export default MapDefaultContextMenuComponent;
