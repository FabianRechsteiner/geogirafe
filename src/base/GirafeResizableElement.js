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

  constructor() {
    super();
  }

  makeResizable() {
    this.panel = this.shadow.querySelector('#panel');
    this.host = this.panel.getRootNode().host;
    this.gutter = this.shadow.querySelector('#gutter');
    this.gutter.onmousedown = (e) => this.mousedown(this, e);
  }

  mousedown(_this, e) {

    document.onmousemove = (e) => this.mousemove(this, e);
    document.onmouseup = (e) => this.mouseup(this, e);

    this.prevX = e.x;
    this.panelRect = this.panel.getBoundingClientRect();
  }

  mousemove(_this, e) {
    const newX = this.prevX - e.x;
    this.panel.style.width = this.panelRect.width - newX + "px";
    this.host.style.width = this.panelRect.width - newX + "px";
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