import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import { MapContextMenuState } from '../contextmenustate';
import type { Callback } from '../../../tools/state/statemanager';

import I18nManager from '../../../tools/i18n/i18nmanager';
import proj4 from 'proj4';

class ContextMenuContentComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../../../styles/common.css'];

  i18nManager: I18nManager;
  private readonly eventsCallbacks: Callback[] = [];
  private readonly MapContextMenuState: MapContextMenuState;

  position: number[] = [];
  projection!: string;
  proj4 = proj4;

  constructor() {
    super('context-menu-content');
    this.MapContextMenuState = this.state.extendedState.mapcontextmenu as MapContextMenuState;
    this.i18nManager = I18nManager.getInstance();
  }

  async renderComponent() {
    this.position = this.MapContextMenuState.position!;
    this.projection = this.MapContextMenuState.projection!;
    super.render();
    super.girafeTranslate();
    this.activateTooltips(false, [800, 0], 'top-end');
  }

  printCoordinate(coordinate: number[], format: 'dms' | 'decimal', precision: number): string[] {
    let coordString: string[] = [];
    if (format === 'dms') {
      coordString = this.decimalToDMS(coordinate);
    } else if (format === 'decimal') {
      coordString = coordinate.map((x) => x.toFixed(precision));
    }
    return coordString;
  }

  decimalToDMS(coordinate: number[]): string[] {
    const convertToDMS = (decimal: number, isLatitude: boolean): string => {
      const degrees = Math.floor(Math.abs(decimal));
      const minutes = Math.floor((Math.abs(decimal) - degrees) * 60);
      const seconds = Math.round((Math.abs(decimal) - degrees - minutes / 60) * 3600 * 100) / 100;
      let direction;
      if (isLatitude) {
        direction = decimal >= 0 ? 'N' : 'S';
      } else {
        direction = decimal >= 0 ? 'E' : 'W';
      }
      return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
    };

    const latitude = coordinate[1];
    const longitude = coordinate[0];
    return [convertToDMS(longitude, false), convertToDMS(latitude, true)];
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
    this.state.interface.contextMenuVisible = false;
    this.unregisterEvents();
  }

  async connectedCallback() {
    await this.loadConfig();
    this.renderComponent();
    this.registerEvents();
  }
}

export default ContextMenuContentComponent;
