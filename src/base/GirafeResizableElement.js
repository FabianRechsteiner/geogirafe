import GirafeHTMLElement from './GirafeHTMLElement.js';

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

  panel = null;
  panelRect = null;
  gutter = null;
  hideButton = null;
  closeButton = null;
  dock = null;
  prevX = 0;
  host = null;
  toggleWidth = null;
  lastWidth = 0;
  hideWidth = 0;

  constructor(component) {
    super(component);
    this.dock = this.getAttribute('dock');
  }

  render() {
    super.render();
    this.makeResizable();
  }

  makeResizable() {
    this.panel = this.shadow.querySelector('#panel');
    this.host = this.panel.getRootNode().host;
    this.gutter = this.shadow.querySelector('#gutter');
    this.gutter.onmousedown = (e) => this.#mousedown(e);
    this.gutter.ondblclick = (e) => this.#togglePanel(e);
    this.hideButton = this.shadow.getElementById('hide');
    if (!this.isNullOrUndefined(this.hideButton)) {
      this.hideButton.onclick = () => this.#togglePanel();
    }
    this.closeButton = this.shadow.getElementById('close');
    if (!this.isNullOrUndefined(this.closeButton)) {
      this.closeButton.onclick = () => this.closePanel();
    }
  }

  #mousedown(e) {
    e.preventDefault();
    document.onmousemove = (e) => this.#mousemove(e);
    document.onmouseup = (e) => this.#mouseup(e);

    this.prevX = e.x;
    this.panelRect = this.panel.getBoundingClientRect();
    if (!this.isNullOrUndefined(this.hideButton)) {
      this.hideWidth = this.hideButton.getBoundingClientRect().width;
    }
  }

  closePanel() {
    throw 'This function must be overriden to close the associated panel';
  }

  #togglePanel() {
    this.toggleWidth = this.gutter.getBoundingClientRect().width;

    const width = this.panel.getBoundingClientRect().width;
    if (width <= this.toggleWidth) {
      // Panel is already hidden.
      // => We reset it to the last width
      this.panel.style.width = this.lastWidth + 'px';
      this.host.style.width = this.lastWidth + 'px';
      this.panel.style.minWidth = "";
      this.host.style.minWidth = "";

      if (!this.isNullOrUndefined(this.hideButton)) {
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
      this.panel.style.minWidth = 0;
      this.panel.style.overflow = 'hidden';
      this.host.style.minWidth = 0;

      if (!this.isNullOrUndefined(this.hideButton)) {
        this.hideButton.classList.add('closed');
      }
    }
  }

  #mousemove(e) {
    e.preventDefault();
    const newX = this.prevX - e.x;
    let newWidth = null;
    let hideLeft = null;
    if (this.dock === 'left') {
      newWidth = this.panelRect.width - newX;
      if (!this.isNullOrUndefined(this.hideButton)) {
        this.hideButton.style.left = this.panel.getBoundingClientRect().width + "px";
      }
      if (!this.isNullOrUndefined(this.closeButton)) {
        this.closeButton.style.left = this.panel.getBoundingClientRect().width + "px";
      }
    }
    else if (this.dock === 'right') {
      newWidth = this.panelRect.width + newX;
      if (!this.isNullOrUndefined(this.hideButton)) {
        this.hideButton.style.right = this.panel.getBoundingClientRect().width + "px";
      }
      if (!this.isNullOrUndefined(this.closeButton)) {
        this.closeButton.style.right = this.panel.getBoundingClientRect().width + "px";
      }
    }
    this.panel.style.width = newWidth + "px";
    this.host.style.width = newWidth + "px";

    if (!this.isNullOrUndefined(this.hideButton)) {
      this.hideButton.classList.remove('closed');
    }
  }

  #mouseup(e) {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
    });
  }
}

export default GirafeResizableElement;