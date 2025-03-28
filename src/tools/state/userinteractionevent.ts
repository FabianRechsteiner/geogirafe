import { MapBrowserEvent } from 'ol';

type gGKeyEvent = 'keydown' | 'keyup' | 'keypress';
type gGKey =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z'
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'Backspace'
  | 'Tab'
  | 'Enter'
  | 'Escape'
  | 'Space'
  | 'PageUp'
  | 'PageDown'
  | 'End'
  | 'Home'
  | 'ArrowLeft'
  | 'ArrowUp'
  | 'ArrowRight'
  | 'ArrowDown'
  | 'Delete'
  | 'Insert'
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'F10'
  | 'F11'
  | 'F12';

type modifier = 'ctrl' | 'shift' | 'alt' | 'meta';

type gGMouseEvent =
  | 'map.mouseclick'
  | 'map.mousedoubleclick'
  | 'map.mousemove'
  | 'map.wheelclick'
  | 'map.select'
  | 'map.draw'
  | 'map.modify'
  | 'map.snap'
  | 'map.contextmenu'
  | 'map.drop'
  | 'globe.mouseclick'
  | 'globe.select'
  | 'globe.draw'
  | 'globe.modify'
  | 'globe.snap';

// Helper type to define optional parts
type OptionalKey<S extends string> = '' | `.${S}`;

// Keyboard shortcuts are a combination of an event type (keydown, keyup, keypress),
// optional modifier and key, e.g. 'keydown.ArrowDown' or 'keydown.ctrl.X'
type KeyEventWithModifier = `${gGKeyEvent}${OptionalKey<modifier>}.${gGKey}`;
// Mouse events can also have an optional modifier, e.g. 'map.mouseclick.shift'
type MouseEventWithModifier = `${gGMouseEvent}${OptionalKey<modifier>}`;

// Combine keyboard and mouse events
export type GgUserInteractionEvent = MouseEventWithModifier | KeyEventWithModifier;

// Some events consist of multiple simpler events. gGEventDependencies defines 
// which additional events have to be considered/blocked when an event registers exclusively.
export const gGEventDependencies: Partial<Record<GgUserInteractionEvent, Array<GgUserInteractionEvent>>> = {
  'map.select': ['map.mouseclick', 'map.mouseclick.ctrl', 'map.mouseclick.shift'],
  'map.draw': ['map.mouseclick', 'map.mousedoubleclick'],
  'map.modify': ['map.mouseclick']
};

/**
 * Helper methods to identify mouse button presses, inspired by openlayers condition.js, but expanded to handle
 * MapBrowsersEvents (ol), PointerEvents and MouseEvents
 */
type CombinedPointerEvent = MapBrowserEvent<PointerEvent> | PointerEvent | MouseEvent;

const checkMouseButton = (evt: CombinedPointerEvent, button: number): boolean => {
  if (evt instanceof MapBrowserEvent && evt.originalEvent) {
    evt = evt.originalEvent;
  }
  return ((evt instanceof PointerEvent && evt.isPrimary) || evt instanceof MouseEvent) && evt.button === button;
};

export const isPrimaryPointerAction = (evt: CombinedPointerEvent): boolean => {
  return checkMouseButton(evt, 0);
};

export const isAlternateMouseClick = (evt: CombinedPointerEvent): boolean => {
  return checkMouseButton(evt, 2);
};

export const isMouseWheelClick = (evt: CombinedPointerEvent): boolean => {
  return checkMouseButton(evt, 1);
};
