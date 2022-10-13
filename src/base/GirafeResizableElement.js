import GirafeHTMLElement from '/base/GirafeHTMLElement.js';

/*
Minimal template for a draggable object : 
It must have 2 divs :
- One for the whole panel (id="panel")
- One for the gutter (id="gutter"). This is where the panel can be resized.

Example:

<div id="panel">
  <div id="gutter"></div>
</div>

Then in order to make an component resizable, 
the base method makeResizable() must be called after rendering the template.

That's it.

*/

class GirafeResizableElement extends GirafeHTMLElement {

  panel = null;
  panelRect = null;
  gutter = null;
  prevX = 0;
  host = null;
  toggleWidth = 10;
  lastWidth = 0;

  constructor() {
    super();
  }

  makeResizable() {
    this.panel = this.shadow.querySelector('#panel');
    this.host = this.panel.getRootNode().host;
    this.gutter = this.shadow.querySelector('#gutter');
    this.gutter.onmousedown = (e) => this.mousedown(this, e);
    this.gutter.ondblclick = (e) => this.togglePanel(this, e);
  }

  mousedown(_this, e) {

    document.onmousemove = (e) => _this.mousemove(this, e);
    document.onmouseup = (e) => _this.mouseup(this, e);

    _this.prevX = e.x;
    _this.panelRect = _this.panel.getBoundingClientRect();
  }

  togglePanel(_this, e) {
    const width = _this.panel.getBoundingClientRect().width;
    if (width <= _this.toggleWidth) {
      // Panel is already hidden.
      // => We reset it to the last width
      _this.panel.style.width = _this.lastWidth + 'px';
      _this.host.style.width = _this.lastWidth + 'px';
    }
    else {
      // Hide the panel
      _this.lastWidth = width;
      _this.panel.style.width = _this.toggleWidth + 'px';
      _this.host.style.width = _this.toggleWidth + 'px';
    }
  }

  mousemove(_this, e) {
    const newX = _this.prevX - e.x;
    _this.panel.style.width = _this.panelRect.width - newX + "px";
    _this.host.style.width = _this.panelRect.width - newX + "px";
  }

  mouseup(_this, e) {
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