import { Map, Overlay } from 'ol';
import { Coordinate } from 'ol/coordinate';
import MapComponent from '../component';

export type MenuEntry = {
  entry: string;
  callback: (e: MouseEvent, mapCoordinate: Coordinate) => void;
};

export function primaryMouseClick(evt: MouseEvent) {
  return evt.button === 0;
}

export function alternateMouseClick(evt: MouseEvent) {
  return evt.button === 2;
}

/**
 * Show a simple context menu when clicking on the map
 */

export class ContextMenu {
  private readonly map: Map;
  private readonly overlay: Overlay;
  private readonly container: HTMLDivElement;
  private _enabled: boolean = true;
  private readonly _contextMenuEventListener: (evt: MouseEvent) => void;
  private readonly _clickEventListener: (evt: MouseEvent) => void;

  constructor(
    mapComponent: MapComponent,
    menuEntries: MenuEntry[] = [],
    mouseTrigger: (evt: MouseEvent) => boolean = alternateMouseClick,
    openCondition: (evt: MouseEvent, mapCoordinate: Coordinate) => boolean = () => true
  ) {
    this.map = mapComponent.olMap;

    this.container = document.createElement('div');
    this.container.classList.add('contextmenu');
    this.container.classList.add('hidden');
    const popupDiv = mapComponent.shadow.getElementById('map-contextmenu') as HTMLDivElement;
    popupDiv.appendChild(this.container);
    this.updateMenuEntries(menuEntries);

    this.overlay = new Overlay({
      element: this.container,
      position: undefined
    });
    this.map.addOverlay(this.overlay);

    this._contextMenuEventListener = (evt: MouseEvent): void => {
      this._handleContextmenuEvent(evt, mouseTrigger, openCondition);
    };

    this._clickEventListener = (_evt: MouseEvent): void => {
      this._handleClickEvent();
    };

    this.map.getViewport().addEventListener('contextmenu', this._contextMenuEventListener);
    this.map.getViewport().addEventListener('click', this._clickEventListener);
  }

  get visible(): boolean {
    return !!this.overlay.getPosition();
  }

  get enabled(): boolean {
    return this._enabled;
  }

  enable(): void {
    this._enabled = true;
    this.map.getViewport().addEventListener('contextmenu', this._contextMenuEventListener);
    this.map.getViewport().addEventListener('click', this._clickEventListener);
  }

  disable(): void {
    this._enabled = false;
    this.map.getViewport().removeEventListener('contextmenu', this._contextMenuEventListener);
    this.map.getViewport().removeEventListener('click', this._clickEventListener);
  }

  _handleContextmenuEvent(
    evt: MouseEvent,
    mouseTrigger: (evt: MouseEvent) => boolean,
    openCondition: (evt: MouseEvent, mapCoordinate: Coordinate) => boolean
  ): void {
    if (!this._enabled) {
      return;
    }
    if (this.visible) {
      this.closeMenu();
    }
    evt.preventDefault();

    const mapCoordinate = this.map.getCoordinateFromPixel([evt.offsetX, evt.offsetY]);

    if (mouseTrigger(evt) && openCondition(evt, mapCoordinate)) {
      this.openMenu(mapCoordinate);
    } else {
      evt.stopPropagation();
    }
  }

  _handleClickEvent() {
    if (!this._enabled) {
      return;
    }
    if (this.visible) {
      this.closeMenu();
    }
  }

  updateMenuEntries(menuEntries: MenuEntry[]): void {
    this.container.replaceChildren('');

    menuEntries.forEach((entry) => {
      const div = document.createElement('div');
      div.classList.add('menu-entry');
      div.innerHTML = entry.entry;
      div.addEventListener('click', (evt: MouseEvent) => this.onClickEntry(evt, entry.callback));
      this.container.appendChild(div);
    });
  }

  openMenu(mapCoordinates: Coordinate): void {
    this.overlay.setPosition(mapCoordinates);
    this.container.classList.remove('hidden');
  }

  closeMenu(): void {
    this.overlay.setPosition(undefined);
    this.container.classList.add('hidden');
  }

  onClickEntry(evt: MouseEvent, callback: (e: MouseEvent, mapCoordinate: Coordinate) => void): void {
    try {
      callback(evt, this.overlay.getPosition()!);
    } finally {
      this.closeMenu();
    }
  }
}
