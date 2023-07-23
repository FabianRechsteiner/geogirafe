import GirafeHTMLElement from './GirafeHTMLElement';

/*
Minimal template for a draggable object : 
It must have 2 divs :
- One for the whole box (id="draggable")
- One for the header (id="header"). This is the div that will be used for dragging the while box

Example:

<div id="draggable">
  <div id="header">
    Click here to move
    <div id="close">
      <i class="fa-solid"></i>
    </div>
  </div>
  <!-- PLACE CONTENT HERE -->
</div>

Then in order to make an component draggable, 
the base method makeDraggable() must be called after rendering the template.

That's it, it should work.

*/

class GirafeDraggableElement extends GirafeHTMLElement {

  button?: HTMLElement;
  div?: HTMLElement;
  header?: HTMLElement;
  closeButton?: HTMLElement;

  get host(): HTMLElement {
    return (this.shadow.getRootNode() as ShadowRoot).host as HTMLElement;
  }

  pos1 = 0;
  pos2 = 0;
  pos3 = 0;
  pos4 = 0;

  constructor(component: string) {
    super(component);
  }

  makeDraggable() {
    this.div = this.shadow.querySelector('#draggable')!;
    this.header = this.shadow.querySelector('#header')!;
    this.header.onmousedown = (e) => this.dragMouseDown(this, e);

    this.closeButton = this.shadow.getElementById('close')!;
    if (!this.isNullOrUndefined(this.closeButton)) {
      this.closeButton.onclick = () => this.closeWindow();
    }
  }

  closeWindow() {
    throw 'This function must be overriden to close the associated window';
  }

  dragMouseDown(_this: GirafeDraggableElement, e: MouseEvent) {
    e.preventDefault();
    // get the mouse cursor position at startup:
    _this.pos3 = e.clientX;
    _this.pos4 = e.clientY;
    document.onmouseup = () => _this.closeDragElement();
    // call a function whenever the cursor moves:
    document.onmousemove = (e) => _this.elementDrag(_this, e);
  }

  elementDrag(_this: GirafeDraggableElement, e: MouseEvent) {
    e.preventDefault();

    const hostRect = _this.host.getBoundingClientRect();
    
    // Position left
    const pos1 = _this.pos3 - e.clientX;
    const newLeft = _this.host.offsetLeft - pos1;
    const newRight = newLeft + hostRect.width;
    if (newLeft < 0) {
      _this.host.style.left = "0px";
    }
    else if (newRight > this.getBodyWidth()) {
      _this.host.style.left = (this.getBodyWidth() - hostRect.width) + "px";
    }
    else {
      _this.pos1 = pos1;
      _this.pos3 = e.clientX;
      _this.host.style.left = newLeft + "px";
    }
    
    // Position top
    const pos2 = _this.pos4 - e.clientY;
    const newTop = _this.host.offsetTop - pos2;
    const newBottom = newTop + hostRect.height;
    if (newTop < 0) {
      _this.host.style.top = "0px";
    }
    else if (newBottom > this.getBodyHeight()) {
      _this.host.style.top = (this.getBodyHeight() - hostRect.height) + "px";
    }
    else {
      _this.pos2 = pos2;
      _this.pos4 = e.clientY;
      _this.host.style.top = newTop + "px";
    }
  }

  getBodyWidth() {
    return Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.offsetWidth,
      document.documentElement.clientWidth
    );
  }
  
  getBodyHeight() {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.documentElement.clientHeight
    );
  }

  closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

export default GirafeDraggableElement;
