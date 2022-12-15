import GirafeHTMLElement from '/base/GirafeHTMLElement.js';

/*
Minimal template for a draggable object : 
It must have 2 divs :
- One for the whole panel (id="panel"). Attribute dock is mandatory and can have the values "left" or "right"
- One for the gutter (id="gutter"). This is where the panel can be resized.

Example:

<div id="panel" dock="left">
  <div id="gutter"></div>
  <div id="hide"></div>
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
  minWidth = null;
  hideWidth = 0;

  constructor() {
    super();

    this.dock = this.getAttribute('dock');
  }

  makeResizable() {
    this.panel = this.shadow.querySelector('#panel');
    this.host = this.panel.getRootNode().host;
    this.gutter = this.shadow.querySelector('#gutter');
    this.gutter.onmousedown = (e) => this.mousedown(this, e);
    this.gutter.ondblclick = (e) => this.togglePanel(this, e);
    this.hide = this.shadow.querySelector('#hide');
    if (!this.isNullOrUndefined(this.hide)) {
      this.hide.onclick = (e) => this.togglePanel(this, e);
    }
    this.minWidth = this.panel.style.minWidth;
    console.log(this.minWidth);
  }

  mousedown(_this, e) {
    e.preventDefault();
    document.onmousemove = (e) => _this.mousemove(this, e);
    document.onmouseup = (e) => _this.mouseup(this, e);

    _this.prevX = e.x;
    _this.panelRect = _this.panel.getBoundingClientRect();
    _this.hideWidth = this.hide.getBoundingClientRect().width;
  }

  togglePanel(_this, e) {
    this.toggleWidth = this.gutter.getBoundingClientRect().width;

    const width = _this.panel.getBoundingClientRect().width;
    if (width <= _this.toggleWidth) {
      // Panel is already hidden.
      // => We reset it to the last width
      _this.panel.style.width = _this.lastWidth + 'px';
      _this.host.style.width = _this.lastWidth + 'px';
      _this.panel.style.minWidth = this.minWidth;
      _this.host.style.minWidth = this.minWidth;

      _this.hide.style.left = _this.lastWidth - 8 + "px";
    }
    else {
      // Hide the panel
      _this.lastWidth = width;
      _this.panel.style.width = _this.toggleWidth + 'px';
      _this.host.style.width = _this.toggleWidth + 'px';
      _this.panel.style.minWidth = 0;
      _this.host.style.minWidth = 0;

      _this.hide.style.left = -8 + "px";
    }
  }

  mousemove(_this, e) {
    e.preventDefault();
    const newX = _this.prevX - e.x;
    let newWidth = null;
    if (_this.dock === 'left') {
      newWidth = _this.panelRect.width - newX;
    }
    else if (_this.dock === 'right') {
      newWidth = _this.panelRect.width + newX;
    }
    _this.panel.style.width = newWidth + "px";
    _this.host.style.width = newWidth + "px";

    const newHideLeft = ((newWidth > _this.minWidth) ? newWidth : _this.minWidth) - 5;
    _this.hide.style.left = newHideLeft + "px";
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