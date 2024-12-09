import GirafeHTMLElement from './GirafeHTMLElement';

/*
Minimal template for a draggable object :
It must have 2 divs :
- One for the whole panel (id="panel"). Attribute dock is mandatory and can have the values "left" or "right"
- One for the gutter (id="gutter"). This is where the panel can be resized.

Example:

<div id="panel" dock="left">
  <div id="gutter"></div>
  <div id="close"></div>
</div>

Then in order to make an component resizable,
the base method makeResizable() must be called after rendering the template.

That's it.

*/

class GirafeResizableElement extends GirafeHTMLElement {
  gutter?: HTMLElement;
  closeButton?: HTMLElement;
  dock: 'left' | 'right' | 'bottom';
  prevX = 0;
  prevY = 0;

  toggleSize: number = 0;

  lastWidth = 0;
  minWidth?: number;
  maxWidth?: number;

  lastHeight = 0;
  minHeight?: number;
  maxHeight?: number;

  constructor(component: string, docking?: 'left' | 'right' | 'bottom') {
    super(component);
    const dock = docking ?? this.getAttribute('dock');
    if (!dock) {
      this.dock = 'right';
    } else if (dock === 'left' || dock === 'right' || dock === 'bottom') {
      this.dock = dock;
    } else {
      throw new Error(`Invalid value for the attribute dock: ${dock}. Should be one of [left, right, bottom]`);
    }
  }

  public render() {
    this.restoreLastDimensions();
    super.render();
    this.makeResizable();
  }

  public makeResizable() {
    this.gutter = this.shadow.querySelector('#gutter')!;
    this.gutter.onmousedown = (e) => this.mousedown(e);
    this.gutter.ondblclick = () => this.togglePanelInternal();

    this.closeButton = this.shadow.getElementById('close') || undefined;
    if (this.closeButton) {
      this.closeButton.onclick = () => this.closePanel();
    }

    this.toggleSize =
      this.dock === 'bottom' ? this.gutter.getBoundingClientRect().height : this.gutter.getBoundingClientRect().width;
    this.initSizeLimits();
  }

  private initSizeLimits() {
    // If there is a configured minWidth or maxWidth, we have to take care of it
    const css = getComputedStyle(this);
    const minWidth = parseFloat(css.minWidth);
    this.minWidth = isNaN(minWidth) ? undefined : minWidth;

    const maxWidth = parseFloat(css.maxWidth);
    this.maxWidth = isNaN(maxWidth) ? undefined : maxWidth;

    const minHeight = parseFloat(css.minHeight);
    this.minHeight = isNaN(minHeight) ? undefined : minHeight;

    const maxHeight = parseFloat(css.maxHeight);
    this.maxHeight = isNaN(maxHeight) ? undefined : maxHeight;
  }

  private mousedown(e: MouseEvent) {
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('resize-start'));
    document.onmousemove = (e) => this.mousemove(e);
    document.onmouseup = () => this.mouseup();

    this.prevX = e.x;
    this.prevY = e.y;

    this.lastWidth = parseFloat(getComputedStyle(this).width);
    this.lastHeight = parseFloat(getComputedStyle(this).height);
  }

  private mousemove(e: MouseEvent) {
    e.preventDefault();
    const newX = this.prevX - e.x;
    const newY = this.prevY - e.y;

    if (this.dock === 'left') {
      this.resizePanelLeft(newX);
    } else if (this.dock === 'right') {
      this.resizePanelRight(newX);
    } else if (this.dock === 'bottom') {
      this.resizePanelBottom(newY);
    }
  }

  private mouseup() {
    // stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
    this.dispatchEvent(new CustomEvent('resize-end'));
  }

  protected closePanel() {
    throw new Error('This function must be overriden to close and clean the associated panel');
  }

  protected clean() {
    this.style.width = '';
    this.style.height = '';
  }

  private restoreLastDimensions() {
    if (this.lastWidth) {
      this.style.width = this.lastWidth + 'px';
    }
    if (this.lastHeight) {
      this.style.height = this.lastHeight + 'px';
    }
  }

  private togglePanelInternal() {
    if (this.dock === 'left' || this.dock === 'right') {
      this.togglePanelVertically();
    } else {
      this.togglePanelHorizontally();
    }
  }

  private togglePanelVertically() {
    const width = this.getBoundingClientRect().width;
    if (width <= this.toggleSize) {
      // Panel is already hidden.
      // => We reset it to the last width
      this.style.width = this.lastWidth + 'px';
      this.style.minWidth = this.minWidth + 'px';
    } else {
      // Hide the panel
      this.lastWidth = width;
      this.style.width = this.toggleSize + 'px';
      this.style.minWidth = '0';
    }
  }

  private togglePanelHorizontally() {
    const height = this.getBoundingClientRect().height;
    if (height <= this.toggleSize) {
      // Panel is already hidden.
      // => We reset it to the last height
      this.style.height = this.lastHeight + 'px';
      this.style.minWidth = this.minHeight + 'px';
    } else {
      // Hide the panel
      this.lastHeight = height;
      this.style.height = this.toggleSize + 'px';
      this.style.minHeight = '0';
    }
  }

  private getLimitedWidth(width: number) {
    if (this.minWidth && width < this.minWidth) {
      return this.minWidth;
    }
    if (this.maxWidth && width > this.maxWidth) {
      return this.maxWidth;
    }
    return width;
  }

  private getLimitedHeight(height: number) {
    if (this.minHeight && height < this.minHeight) {
      return this.minHeight;
    }
    if (this.maxHeight && height > this.maxHeight) {
      return this.maxHeight;
    }

    return height;
  }

  private resizePanelLeft(newX: number) {
    const newWidth = this.getLimitedWidth(this.lastWidth - newX);
    this.style.width = newWidth + 'px';
  }

  private resizePanelRight(newX: number) {
    const newWidth = this.getLimitedWidth(this.lastWidth + newX);
    this.style.width = newWidth + 'px';
  }

  private resizePanelBottom(newY: number) {
    const newHeight = this.getLimitedHeight(this.lastHeight + newY);
    this.style.height = newHeight + 'px';
  }
}

export default GirafeResizableElement;
