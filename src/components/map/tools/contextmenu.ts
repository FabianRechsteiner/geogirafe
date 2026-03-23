// SPDX-License-Identifier: Apache-2.0
import { Overlay } from 'ol';
import { Coordinate } from 'ol/coordinate';
import { v4 as uuidv4 } from 'uuid';
import IGirafeContext from '../../../tools/context/icontext';

export enum EntryInteractionType {
  ENABLED,
  DISABLED,
  NOT_SHOWN
}

export type MenuEntry = {
  entry: string;
  callback: (e: MouseEvent, mapCoordinate: Coordinate) => void;
  prepare?: (e: MouseEvent, mapCoordinate: Coordinate) => EntryInteractionType;
};

/**
 * Show a simple context menu when clicking on the map
 */

export class ContextMenu {
  name: string;
  private _active: boolean = false;
  private readonly isExclusive: boolean;
  private readonly overlay: Overlay;
  private readonly container: HTMLDivElement;
  private readonly openEventListener: (evt: PointerEvent | MouseEvent) => void;
  private readonly closeEventListener: (evt: PointerEvent | MouseEvent) => void;
  private readonly context;
  private readonly menuEntries: MenuEntry[];
  private menuEntryDivs: Record<string, HTMLDivElement> = {};

  private get map() {
    return this.context.mapManager.getMap();
  }

  public constructor(
    context: IGirafeContext,
    menuEntries: MenuEntry[] = [],
    isExclusive: boolean = false,
    openCondition: (evt: PointerEvent | MouseEvent, mapCoordinate: Coordinate) => boolean = () => true
  ) {
    this.name = `contextmenu-${uuidv4()}`;
    this.context = context;
    this.menuEntries = menuEntries;
    this.isExclusive = isExclusive;

    this.container = document.createElement('div');
    this.container.classList.add('contextmenu');
    this.container.classList.add('hidden');
    this.updateMenuEntries();

    this.overlay = new Overlay({
      element: this.container,
      position: undefined
    });
    this.map.addOverlay(this.overlay);

    this.openEventListener = (evt: PointerEvent | MouseEvent): void => {
      if (this.context.userInteractionManager.canListenerExecute('map.contextmenu', this.name)) {
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
    if (this.context.userInteractionManager.registerListener('map.contextmenu', this.isExclusive, this.name)) {
      this.map.getViewport().addEventListener('contextmenu', this.openEventListener);
    }
    this.map.getViewport().addEventListener('click', this.closeEventListener);
    this._active = true;
  }

  private disable(): void {
    this._active = false;
    this.context.userInteractionManager.unregisterAllListenersOfTool(this.name);
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
      this.prepareMenuEntries(evt, mapCoordinate);
      this.openMenu(mapCoordinate);
    } else {
      evt.stopPropagation();
    }
  }

  updateMenuEntries(): void {
    this.container.replaceChildren('');
    this.menuEntryDivs = {};

    for (const entry of this.menuEntries) {
      const div = document.createElement('div');
      div.classList.add('menu-entry');
      div.innerHTML = this.context.i18nManager.getTranslation(entry.entry);
      div.addEventListener('click', (evt: PointerEvent | MouseEvent) => this.onClickMenuEntry(evt, entry.callback));
      this.container.appendChild(div);
      this.menuEntryDivs[entry.entry] = div;
    }
  }

  prepareMenuEntries(evt: PointerEvent | MouseEvent, mapCoordinate: Coordinate): void {
    for (const entry of this.menuEntries) {
      const interactionType = entry.prepare?.(evt, mapCoordinate) ?? EntryInteractionType.ENABLED;
      const menuEntryDiv = this.menuEntryDivs[entry.entry];
      switch (interactionType) {
        case EntryInteractionType.ENABLED:
          menuEntryDiv.ariaDisabled = 'false';
          menuEntryDiv.style.display = 'block';
          break;
        case EntryInteractionType.DISABLED:
          menuEntryDiv.ariaDisabled = 'true';
          menuEntryDiv.style.display = 'block';
          break;
        case EntryInteractionType.NOT_SHOWN:
          menuEntryDiv.ariaDisabled = 'true';
          menuEntryDiv.style.display = 'none';
          break;
      }
    }
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
