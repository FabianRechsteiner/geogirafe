import GirafeHTMLElement from './GirafeHTMLElement';

/*
Minimal template for a draggable object :
It must have 2 divs :
- One for the whole panel (id="panel"). Attribute dock is mandatory and can have the values "left" or "right"
- One for the gutter (id="gutter"). This is where the panel can be resized.

Example:

<div id="panel" dock="left">
  <div id="gutter"></div>
  <div id="hide">
    <i class="fa-solid"></i>
  </div>
  <div id="close">
    <i class="fa-solid"></i>
  </div>
</div>

Then in order to make an component resizable,
the base method makeResizable() must be called after rendering the template.

That's it.

*/

class GirafeResizableElement extends GirafeHTMLElement {

  panel?: HTMLElement;
  panelRect?: DOMRect;
  gutter?: HTMLElement;
  hideButton?: HTMLElement;
  closeButton?: HTMLElement;
  // TODO: why not use an enum?
  dock: string;
  prevX = 0;
  prevY = 0;
  toggleWidth?: number;
  lastWidth = 0;
  hideWidth = 0;

  get host(): HTMLElement {
    return (this.shadow.getRootNode() as ShadowRoot).host as HTMLElement;
  }

  constructor(component: string) {
    super(component);
    this.dock = this.getAttribute('dock') ?? 'right';
  }

  render() {
    super.render();
    this.makeResizable();
  }

  makeResizable() {
    this.panel = this.shadow.querySelector('#panel')!;
    this.gutter = this.shadow.querySelector('#gutter')!;
    this.gutter.onmousedown = (e) => this.#mousedown(e);
    this.gutter.ondblclick = () => this.#togglePanel();
    this.hideButton = this.shadow.getElementById('hide')!;
    if (this.hideButton) {
      this.hideButton.onclick = () => this.#togglePanel();
    }
    this.closeButton = this.shadow.getElementById('close')!;
    if (this.closeButton) {
      this.closeButton.onclick = () => this.closePanel();
    }
  }

  #mousedown(e: MouseEvent) {
    e.preventDefault();
    document.onmousemove = (e) => this.#mousemove(e);
    document.onmouseup = () => this.#mouseup();

    this.prevX = e.x;
    this.prevY = e.y;
    this.panelRect = this.panel!.getBoundingClientRect();
    if (this.hideButton) {
      this.hideWidth = this.hideButton.getBoundingClientRect().width;
    }
  }

  closePanel() {
    throw 'This function must be overriden to close the associated panel';
  }

  #togglePanel() {
    if (this.dock === 'left' || this.dock === 'right') {
      this.#togglePanelVertically();
    }
    else {
      this.#togglePanelHorizontally();
    }
  }

  #togglePanelVertically() {
    if (!this.panel || !this.gutter) {
      throw new Error("GirafeResizableElement.makeResizable() must be called before togglePanelVertically()");
    }
    this.toggleWidth = this.gutter.getBoundingClientRect().width;

    const width = this.panel.getBoundingClientRect().width;
    if (width <= this.toggleWidth) {
      // Panel is already hidden.
      // => We reset it to the last width
      this.panel.style.width = this.lastWidth + 'px';
      this.host.style.width = this.lastWidth + 'px';
      this.panel.style.minWidth = "";
      this.host.style.minWidth = "";

      if (this.hideButton) {
        this.hideButton.classList.remove('closed');
        if (this.dock === 'left') {
          this.hideButton.style.left = this.panel.getBoundingClientRect().width + "px";
        }
        else if (this.dock === 'right') {
          this.hideButton.style.right = this.panel.getBoundingClientRect().width + "px";
        }
      }
    }
    else {
      // Hide the panel
      this.lastWidth = width;
      this.panel.style.width = this.toggleWidth + 'px';
      this.host.style.width = this.toggleWidth + 'px';
      this.panel.style.minWidth = '0';
      this.panel.style.overflow = 'hidden';
      this.host.style.minWidth = '0';

      if (this.hideButton) {
        this.hideButton.classList.add('closed');
      }
    }
  }

  #togglePanelHorizontally() {
    if (!this.panel || !this.gutter) {
      throw new Error("GirafeResizableElement.makeResizable() must be called before togglePanelHorizontally()");
    }
    this.toggleWidth = this.gutter.getBoundingClientRect().height;

    const height = this.panel.getBoundingClientRect().height;
    if (height <= this.toggleWidth) {
      // Panel is already hidden.
      // => We reset it to the last width
      this.panel.style.height = this.lastWidth + 'px';
      this.host.style.height = this.lastWidth + 'px';
      this.panel.style.minHeight = "";
      this.host.style.minHeight = "";

      if (this.hideButton) {
        this.hideButton.classList.remove('closed');
        if (this.dock === 'bottom') {
          this.hideButton.style.bottom = this.panel.getBoundingClientRect().height + "px";
        }
        // else if (this.dock === 'right') {
        //   this.hideButton.style.right = this.panel.getBoundingClientRect().width + "px";
        // }
      }
    }
    else {
      // Hide the panel
      this.lastWidth = height;
      this.panel.style.height = this.toggleWidth + 'px';
      this.host.style.height = this.toggleWidth + 'px';
      this.panel.style.minHeight = '0';
      this.panel.style.overflow = 'hidden';
      this.host.style.minHeight = '0';

      if (this.hideButton) {
        this.hideButton.classList.add('closed');
      }
    }
  }

  #mousemove(e: MouseEvent) {
    if (!this.panel || !this.panelRect) {
      throw new Error("GirafeResizableElement.makeResizable() must be called before this mousemove()");
    }
    e.preventDefault();
    const newX = this.prevX - e.x;
    const newY = this.prevY - e.y;
    if (this.dock === 'left') {
      let newWidth = this.panelRect.width - newX;
      if (this.hideButton) {
        this.hideButton.style.left = this.panel.getBoundingClientRect().width + "px";
      }
      if (this.closeButton) {
        this.closeButton.style.left = this.panel.getBoundingClientRect().width + "px";
      }
      this.panel.style.width = newWidth + "px";
      this.host.style.width = newWidth + "px";
    }
    else if (this.dock === 'right') {
      let newWidth = this.panelRect.width + newX;
      if (this.hideButton) {
        this.hideButton.style.right = this.panel.getBoundingClientRect().width + "px";
      }
      if (this.closeButton) {
        this.closeButton.style.right = this.panel.getBoundingClientRect().width + "px";
      }
      this.panel.style.width = newWidth + "px";
      this.host.style.width = newWidth + "px";
    }
    else if (this.dock === 'bottom') {
      let newHeight = this.panelRect.height + newY;
      /*if (!this.isNullOrUndefined(this.hideButton)) {
        this.hideButton.style.bottom = this.panel.getBoundingClientRect().width + "px";
      }*/
      /*if (!this.isNullOrUndefined(this.closeButton)) {
        this.closeButton.style.right = this.panel.getBoundingClientRect().width + "px";
      }*/
      this.panel.style.height = newHeight + "px";
      this.host.style.height = newHeight + "px";
    }


    if (this.hideButton) {
      this.hideButton.classList.remove('closed');
    }
  }

  #mouseup() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

export default GirafeResizableElement;
