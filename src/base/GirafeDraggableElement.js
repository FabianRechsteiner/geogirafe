import GirafeHTMLElement from '/base/GirafeHTMLElement.js';

/*
Minimal template for a draggable object : 
It must have 2 divs :
- One for the whole box (id="draggable")
- One for the header (id="header"). This is the div that will be used for dragging the while box

Example:

<div id="draggable">
  <div id="header">Click here to move</div>
  <!-- PLACE CONTENT HERE -->
</div>

Then in order to make an component draggable, 
the base method makeDraggable() must be called after rendering the template.

That's it, it should work.

*/

class GirafeDraggableElement extends GirafeHTMLElement {

  button = null;
  div = null;
  header = null;
  host = null;

  pos1 = 0;
  pos2 = 0;
  pos3 = 0;
  pos4 = 0;

  constructor() {
    super();
  }

  makeDraggable() {
    this.div = this.shadow.querySelector('#draggable');
    this.host = this.div.getRootNode().host;
    this.header = this.shadow.querySelector('#header');
    this.header.onmousedown = (e) => this.dragMouseDown(this, e);
  }

  dragMouseDown(_this, e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    _this.pos3 = e.clientX;
    _this.pos4 = e.clientY;
    document.onmouseup = (e) => _this.closeDragElement(_this, e);
    // call a function whenever the cursor moves:
    document.onmousemove = (e) => _this.elementDrag(_this, e);
  }

  elementDrag(_this, e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    _this.pos1 = _this.pos3 - e.clientX;
    _this.pos2 = _this.pos4 - e.clientY;
    _this.pos3 = e.clientX;
    _this.pos4 = e.clientY;
    // set the element's new position:
    const newTop = (_this.host.offsetTop - _this.pos2);
    if (newTop < 0) {
      newTop = 0;
    }
    _this.host.style.top = newTop + "px";
    const newLeft = (_this.host.offsetLeft - _this.pos1);
    if (newLeft < 0) {
      newLeft = 0;
    }
    _this.host.style.left = newLeft + "px";
  }

  closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      //this.registerEvents();
    });
  }
}

export default GirafeDraggableElement;