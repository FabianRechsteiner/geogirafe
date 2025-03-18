import { minMax } from './utils/utils';

/**
 * Enum representing different directions.
 * With "t" standing for top, "l" for left, "b" for bottom and "r" for right.
 */
enum Direction {
  tl = 'tl',
  t = 't',
  tr = 'tr',
  r = 'r',
  br = 'br',
  b = 'b',
  bl = 'bl',
  l = 'l'
}

/**
 * Class adding listener on existing buttons to let the user resizing a window.
 * The window expects to be displayed in an absolute position.
 *
 * With "t" standing for top, "l" for left, "b" for bottom and "r" for right.
 * The window can implement one or multiple of these buttons:
 *
 * <button tabindex="-1" class="girafe-resizer tl corner"></button>
 * <button tabindex="-1" class="girafe-resizer t top-bottom"></button>
 * <button tabindex="-1" class="girafe-resizer tr corner"></button>
 * <button tabindex="-1" class="girafe-resizer r left-right"></button>
 * <button tabindex="-1" class="girafe-resizer br corner"></button>
 * <button tabindex="-1" class="girafe-resizer b top-bottom"></button>
 * <button tabindex="-1" class="girafe-resizer bl corner"></button>
 * <button tabindex="-1" class="girafe-resizer l left-right"></button>
 *
 */
export default class ResizeWindow {
  private readonly directions: Direction[] = [
    Direction.tl,
    Direction.t,
    Direction.tr,
    Direction.r,
    Direction.br,
    Direction.b,
    Direction.bl,
    Direction.l
  ];
  private readonly shadow: ShadowRoot;
  private readonly host: HTMLElement;
  private top = 0;
  private left = 0;
  private minHeight = 0;
  private maxHeight = 0;
  private minWidth = 0;
  private maxWidth = 0;
  private height = 0;
  private width = 0;
  private originX = 0;
  private originY = 0;
  private elements: (HTMLElement | null)[] = [];
  private readonly className: string = 'girafe-resizer';

  /**
   * Create the instance and calls init.
   */
  constructor(shadow: ShadowRoot) {
    this.shadow = shadow;
    this.host = (this.shadow.getRootNode() as ShadowRoot).host as HTMLElement;
    this.init();
  }

  /**
   * Initializes the class by cleaning and attaching events to new existing elements.
   */
  init() {
    this.destroy();
    this.elements = this.directions.map((direction) => {
      return this.attachEvent(direction);
    });
  }

  /**
   * Destroys all elements in the object and removes their onmousedown event listeners.
   */
  destroy() {
    this.elements.filter((element) => element !== null).forEach((element) => (element!.onmousedown = null));
    this.elements = [];
  }

  /**
   * Attaches an event listener to existing element with the specified direction.
   * @return The element with the attached event listener, or null if no matching element was found.
   */
  private attachEvent(direction: Direction): HTMLElement | null {
    const element: HTMLElement | null = this.shadow.querySelector(`.${this.className}.${direction}`);
    if (!element) {
      return null;
    }
    element.onmousedown = (event: MouseEvent) => {
      this.onResizeStarts(event, direction);
    };
    return element;
  }

  /**
   * Sets up the resize functionality for an element based on the provided MouseEvent and direction.
   * Attach onmousemove and onmouseup to document to handle and stop the resize.
   * @param event - The MouseEvent containing the clientX and clientY coordinates.
   * @param direction - The direction in which the element should be resized.
   */
  private onResizeStarts(event: MouseEvent, direction: Direction) {
    this.originX = event.clientX;
    this.originY = event.clientY;
    const dimension = this.host.getBoundingClientRect();
    this.width = dimension.width;
    this.height = dimension.height;
    const css = getComputedStyle(this.host);
    this.minHeight = parseInt(css.minHeight) || 0;
    this.maxHeight = parseInt(css.maxHeight) || Infinity;
    this.minWidth = parseInt(css.minWidth) || 0;
    this.maxWidth = parseInt(css.maxWidth) || Infinity;
    this.top = parseInt(css.top) || 0;
    this.left = parseInt(css.left) || 0;
    // Call a function whenever the cursor moves.
    document.onmousemove = (dragEvent) => this.resize(dragEvent, direction);
    // Detach events.
    document.onmouseup = () => this.stopResize();
  }

  /**
   * Resizes the element based on the given mouse event and direction.
   * @param event - The MouseEvent containing the "ondrag" clientX and clientY coordinates.
   * @param direction - The direction in which the element should be resized.
   */
  private resize(event: MouseEvent, direction: Direction) {
    const [newTop, newLeft, newHeight, newWidth] = this.getNewSizeAndPosition(event.clientX, event.clientY, direction);
    this.host.style.top = `${newTop}px`;
    this.host.style.left = `${newLeft}px`;
    this.host.style.width = `${newWidth}px`;
    this.host.style.height = `${newHeight}px`;
  }

  /**
   * Calculates the new size and position based on the current client coordinates and direction.
   * @returns an array containing the new top, left, height, and width values in that order.
   * @private
   */
  private getNewSizeAndPosition(
    clientX: number,
    clientY: number,
    direction: Direction
  ): [number, number, number, number] {
    let newHeight = this.height;
    let newWidth = this.width;
    let newTop = this.top;
    let newLeft = this.left;
    let deltaX = clientX - this.originX;
    let deltaY = clientY - this.originY;
    if (direction.includes('t')) {
      const rawNewHeight = this.height - deltaY;
      newHeight = minMax(rawNewHeight, this.minHeight, this.maxHeight);
      // If the height reach the min-max limit, reverse calculate
      // the maxed out deltaY to limit the new top and don't move the window.
      if (newHeight !== rawNewHeight) {
        deltaY = (newHeight - this.height) * -1;
      }
      newTop = this.top + deltaY;
    } else if (direction.includes('b')) {
      newHeight = minMax(this.height + deltaY, this.minHeight, this.maxHeight);
    }
    if (direction.includes('l')) {
      const rawNewWidth = this.width - deltaX;
      newWidth = minMax(rawNewWidth, this.minWidth, this.maxWidth);
      // If the width reach the min-max limit, reverse calculate
      // the maxed out deltaX to limit the new top and don't move the window.
      if (newWidth !== rawNewWidth) {
        deltaX = (newWidth - this.width) * -1;
      }
      newLeft = this.left + deltaX;
    } else if (direction.includes('r')) {
      newWidth = minMax(this.width + deltaX, this.minWidth, this.maxWidth);
    }
    return [newTop, newLeft, newHeight, newWidth];
  }

  /**
   * Stops the resizing functionality by clearing the
   * event listeners for mousemove and mouseup events.
   */
  private stopResize() {
    document.onmousemove = null;
    document.onmouseup = null;
  }
}
