import type { Callback } from '../../../tools/state/statemanager';
import type MapContextMenuComponent from '../component';

import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import { MapContextMenuState } from '../contextmenustate';
import I18nManager from '../../../tools/i18n/i18nmanager';
import proj4 from 'proj4';
import { printCoordinate } from '../../../tools/geometrytools';

class MapDefaultContextMenuContentComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../style.css', '../../../styles/common.css'];

  i18nManager: I18nManager;
  private readonly eventsCallbacks: Callback[] = [];
  private MapContextMenuState!: MapContextMenuState;
  private readonly container!: MapContextMenuComponent;

  position: number[] = [];
  projection!: string;
  proj4 = proj4;
  printCoordinate = printCoordinate;

  constructor() {
    super('default-context-menu-content');
    this.i18nManager = I18nManager.getInstance();
  }

  async renderComponent() {
    super.render();
    super.girafeTranslate();
  }

  registerEvents() {
    this.eventsCallbacks.push(
      this.subscribe(/extendedState\.mapcontextmenu\.sources\..*\.content/, (_oldVal: string, _newVal: string) => {
        console.debug(`mapcontextmenu changed from: ${_oldVal} to: ${_newVal}`);
        super.render();
      }),

      this.subscribe('language', (_oldVal: string, _newVal: string) => {
        console.debug(`Language changed from: ${_oldVal} to: ${_newVal}`);
        super.render();
        super.girafeTranslate();
      })
    );
  }

  unregisterEvents(): void {
    this.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;
  }

  closeMenu() {
    this.container.hideContextMenu('default-overlay');
    this.unregisterEvents();
  }

  async connectedCallback() {
    await this.loadConfig();
    this.MapContextMenuState = this.container.MapContextMenuState;
    this.position = this.MapContextMenuState.position!;
    this.projection = this.MapContextMenuState.projection!;
    this.renderComponent();
    this.registerEvents();
  }
}

export default MapDefaultContextMenuContentComponent;
