import { Map, Overlay } from 'ol';
import { Coordinate } from 'ol/coordinate';
import UserInteractionManager from '../../../tools/state/userInteractionManager';
import MapManager from '../../../tools/state/mapManager';
import { v4 as uuidv4 } from 'uuid';

export type MenuEntry = {
  entry: string;
  callback: (e: MouseEvent, mapCoordinate: Coordinate) => void;
};

/**
 * Show a simple context menu when clicking on the map
 */

export class ContextMenu {
  name: string;
  private _active: boolean = false;
  private readonly isExclusive: boolean;
  private readonly map: Map;
  private readonly overlay: Overlay;
  private readonly container: HTMLDivElement;
  private readonly userInteractionManager;
  private readonly openEventListener: (evt: PointerEvent | MouseEvent) => void;
  private readonly closeEventListener: (evt: PointerEvent | MouseEvent) => void;

  constructor(
    menuEntries: MenuEntry[] = [],
    isExclusive: boolean = false,
    openCondition: (evt: PointerEvent | MouseEvent, mapCoordinate: Coordinate) => boolean = () => true
  ) {
    this.name = `contextmenu-${uuidv4()}`;
    this.map = MapManager.getInstance().getMap();
    this.userInteractionManager = UserInteractionManager.getInstance();
    this.isExclusive = isExclusive;

    this.container = document.createElement('div');
    this.container.classList.add('contextmenu');
    this.container.classList.add('hidden');
    this.updateMenuEntries(menuEntries);

    this.overlay = new Overlay({
      element: this.container,
      position: undefined
    });
    this.map.addOverlay(this.overlay);

    this.openEventListener = (evt: PointerEvent | MouseEvent): void => {
      if (this.userInteractionManager.canListenerExecute('map.contextmenu', this.name)) {
        this.handleContextmenuEvent(evt, openCondition);
      }
    };

    this.closeEventListener = (_evt: PointerEvent | MouseEvent): void => {
      if (!this.active) {
        return;
      }
      if (this.visible) {
        this.closeMenu();
      }
    };

    this.enable();
  }

  get visible(): boolean {
    return !!this.overlay.getPosition();
  }

  get active(): boolean {
    return this._active;
  }

  setActive(active: boolean): void {
    if (active) {
      this.enable();
    } else {
      this.disable();
    }
  }

  private enable(): void {
    if (this.userInteractionManager.registerListener('map.contextmenu', this.isExclusive, this.name)) {
      this.map.getViewport().addEventListener('contextmenu', this.openEventListener);
    }
    this.map.getViewport().addEventListener('click', this.closeEventListener);
    this._active = true;
  }

  private disable(): void {
    this._active = false;
    this.userInteractionManager.unregisterAllListenersOfTool(this.name);
    this.map.getViewport().removeEventListener('contextmenu', this.openEventListener);
    this.map.getViewport().removeEventListener('click', this.closeEventListener);
  }

  private handleContextmenuEvent(
    evt: PointerEvent | MouseEvent,
    openCondition: (evt: PointerEvent | MouseEvent, mapCoordinate: Coordinate) => boolean
  ): void {
    if (!this._active) {
      return;
    }
    if (this.visible) {
      this.closeMenu();
    }
    evt.preventDefault();

    const mapCoordinate = this.map.getCoordinateFromPixel([
      // Pixel coordinates musbe in device independant pixels ("dips")
      evt.offsetX / window.devicePixelRatio,
      evt.offsetY / window.devicePixelRatio
    ]);

    if (openCondition(evt, mapCoordinate)) {
      this.openMenu(mapCoordinate);
    } else {
      evt.stopPropagation();
    }
  }

  updateMenuEntries(menuEntries: MenuEntry[]): void {
    this.container.replaceChildren('');

    menuEntries.forEach((entry) => {
      const div = document.createElement('div');
      div.classList.add('menu-entry');
      div.innerHTML = entry.entry;
      div.addEventListener('click', (evt: PointerEvent | MouseEvent) => this.onClickMenuEntry(evt, entry.callback));
      this.container.appendChild(div);
    });
  }

  openMenu(mapCoordinates: Coordinate): void {
    if (!this.container.parentNode) {
      // Add menu to the DOM
      const popupDiv = document.getElementById('map-contextmenu') as HTMLDivElement;
      popupDiv?.appendChild(this.container);
    }
    this.overlay.setPosition(mapCoordinates);
    this.container.classList.remove('hidden');
  }

  closeMenu(): void {
    this.overlay.setPosition(undefined);
    this.container.classList.add('hidden');
  }

  onClickMenuEntry(
    evt: PointerEvent | MouseEvent,
    callback: (e: PointerEvent | MouseEvent, mapCoordinate: Coordinate) => void
  ): void {
    try {
      callback(evt, this.overlay.getPosition()!);
    } finally {
      this.closeMenu();
    }
  }

  remove(): void {
    this.disable();
    this.map.removeOverlay(this.overlay);
    this.container.remove();
  }
}
