import type { Callback } from '../../../tools/state/statemanager';
import { render } from 'uhtml';

import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import I18nManager from '../../../tools/i18n/i18nmanager';
import MapManager from '../../../tools/state/mapManager';
import { Map, Overlay } from 'ol';

class MapCustomContextMenuComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.css', '../mapcontextmenu.css'];

  private readonly map: Map;
  private readonly eventsCallbacks: Callback[] = [];
  i18nManager: I18nManager;
  private contextMenuOverlay?: Overlay;
  host: HTMLDivElement;

  constructor() {
    super('custom-map-context-menu');
    this.i18nManager = I18nManager.getInstance();
    this.map = MapManager.getInstance().getMap();
    this.host = document.createElement('div');
  }

  async renderContent() {
    render<HTMLDivElement>(this.host, this.template);
    await this.i18nManager.translate(this.host as unknown as DocumentFragment);
  }

  showContextMenu(): void {
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

    this.contextMenuOverlay.setPosition(this.state.position.center);
  }

  closeMenu(): void {
    this.unregisterEvents();
    this.hideContextMenu();
  }

  hideContextMenu(): void {
    if (this.contextMenuOverlay) {
      this.contextMenuOverlay.setPosition(undefined);
    }
  }

  registerEvents(): void {
    this.eventsCallbacks.push(
      this.subscribe('language', (_oldVal: string, _newVal: string) => {
        console.debug(`Language changed from: ${_oldVal} to: ${_newVal}`);
        if (this.contextMenuOverlay) {
          this.renderContent();
        }
      })
    );

    // Map rendering complete event
    this.map.once('rendercomplete', () => {
      if (this.state.position.tooltip) {
        this.showContextMenu();
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

export default MapCustomContextMenuComponent;
