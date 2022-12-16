import GirafeHTMLElement from '/base/GirafeHTMLElement.js';

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
</div>

Then in order to make an component resizable, 
the base method makeResizable() must be called after rendering the template.

That's it.

*/

class GirafeResizableElement extends GirafeHTMLElement {

  panel = null;
  panelRect = null;
  gutter = null;
  hide = null;
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
    this.gutter.onmousedown = (e) => this.mousedown(e);
    this.gutter.ondblclick = (e) => this.togglePanel(e);
    this.hide = this.shadow.querySelector('#hide');
    if (!this.isNullOrUndefined(this.hide)) {
      this.hide.onclick = (e) => this.togglePanel(e);
    }
  }

  mousedown(e) {
    e.preventDefault();
    document.onmousemove = (e) => this.mousemove(e);
    document.onmouseup = (e) => this.mouseup(e);

    this.prevX = e.x;
    this.panelRect = this.panel.getBoundingClientRect();
    this.hideWidth = this.hide.getBoundingClientRect().width;
  }

  togglePanel(e) {
    this.toggleWidth = this.gutter.getBoundingClientRect().width;

    const width = this.panel.getBoundingClientRect().width;
    if (width <= this.toggleWidth) {
      // Panel is already hidden.
      // => We reset it to the last width
      this.panel.style.width = this.lastWidth + 'px';
      this.host.style.width = this.lastWidth + 'px';
      this.panel.style.minWidth = "";
      this.host.style.minWidth = "";

      this.hide.classList.remove('closed');
      this.hide.style.left = this.panel.getBoundingClientRect().width + "px";
    }
    else {
      // Hide the panel
      this.lastWidth = width;
      this.panel.style.width = this.toggleWidth + 'px';
      this.host.style.width = this.toggleWidth + 'px';
      this.panel.style.minWidth = 0;
      this.host.style.minWidth = 0;

      this.hide.classList.add('closed');
    }
  }

  mousemove(e) {
    e.preventDefault();
    const newX = this.prevX - e.x;
    let newWidth = null;
    if (this.dock === 'left') {
      newWidth = this.panelRect.width - newX;
    }
    else if (this.dock === 'right') {
      newWidth = this.panelRect.width + newX;
    }
    this.panel.style.width = newWidth + "px";
    this.host.style.width = newWidth + "px";

    this.hide.classList.remove('closed');
    this.hide.style.left = this.panel.getBoundingClientRect().width + "px";
  }

  mouseup(e) {
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