import GirafeHTMLElement from './GirafeHTMLElement';
import { debounce } from '../tools/utils/debounce';

/*
Minimal template for a draggable object : 
It must have 2 divs :
- One for the whole box (id="draggable")
- One for the header (id="header"). This is the div that will be used for dragging the whole box
- footer is optional
- use class girafe-draggable-window to get the gg floating window style

Example:

<div id="draggable" class="girafe-draggable-window">
  <div id="header">
    Click here to move
    <img id="close" alt="close-icon" src="icons/close.svg" />
  </div>
  <div id="content">
    <!-- PLACE CONTENT HERE -->
  </div>
  <div id="footer"></div>
</div>

Then in order to make an component draggable, 
the base method makeDraggable() must be called after rendering the template.

That's it, it should work.

*/

class GirafeDraggableElement extends GirafeHTMLElement {
  private header?: HTMLElement;
  private closeButton?: HTMLElement;
  private container?: HTMLElement;

  private get host(): HTMLElement {
    return (this.shadow.getRootNode() as ShadowRoot).host as HTMLElement;
  }

  private posX = 0;
  private posY = 0;

  public constructor(component: string) {
    super(component);
  }

  protected makeDraggable(container?: HTMLElement | undefined) {
    this.container = container || document.querySelector('#content')!;
    this.header = this.shadow.querySelector('#header')!;
    this.setDefaultPosition();
    this.header.onmousedown = (e) => this.dragMouseDown(this, e);

    // Reposition the draggable element in the window if it is out of bounds
    window.addEventListener(
      'resize',
      debounce(() => this.resize(this), 200)
    );

    this.closeButton = this.shadow.getElementById('close')!;
    if (!this.isNullOrUndefined(this.closeButton)) {
      this.closeButton.onclick = () => this.closeWindow();
    }
  }

  private setDefaultPosition() {
    const css = getComputedStyle(this.host);
    this.host.style.top = css.top;
    this.host.style.left = css.left;
  }

  protected closeWindow() {
    throw new Error('This function must be overriden to close the associated window');
  }

  private dragMouseDown(_this: GirafeDraggableElement, e: MouseEvent) {
    e.preventDefault();
    // get the mouse cursor position at startup:
    _this.posX = e.clientX;
    _this.posY = e.clientY;
    document.onmouseup = () => _this.closeDragElement();
    // call a function whenever the cursor moves:
    document.onmousemove = (e) => _this.elementDrag(_this, e);
  }

  private elementDrag(_this: GirafeDraggableElement, e: MouseEvent) {
    e.preventDefault();

    const hostRect = _this.host.getBoundingClientRect();

    // Position left
    const pos1 = _this.posX - e.clientX;
    const newLeft = _this.host.offsetLeft - pos1;
    const newRight = newLeft + hostRect.width;
    if (newLeft < 0) {
      _this.host.style.left = '0px';
    } else if (newRight > this.getContainerWidth()) {
      _this.host.style.left = this.getContainerWidth() - hostRect.width + 'px';
    } else {
      _this.posX = e.clientX;
      _this.host.style.left = newLeft + 'px';
    }

    // Position top
    const pos2 = _this.posY - e.clientY;
    const newTop = _this.host.offsetTop - pos2;
    const newBottom = newTop + hostRect.height;
    if (newTop < 0) {
      _this.host.style.top = '0px';
    } else if (newBottom > this.getContainerHeight()) {
      _this.host.style.top = this.getContainerHeight() - hostRect.height + 'px';
    } else {
      _this.posY = e.clientY;
      _this.host.style.top = newTop + 'px';
    }
  }

  private getContainerWidth(): number {
    return Math.max(this.container?.scrollWidth as number, this.container?.offsetWidth as number);
  }

  private getContainerHeight(): number {
    return Math.max(this.container?.scrollHeight as number, this.container?.offsetHeight as number);
  }

  private resize(_this: GirafeDraggableElement) {
    const width = this.getContainerWidth();
    const height = this.getContainerHeight();
    const left = _this.host.style.left;
    const top = _this.host.style.top;
    if (parseInt(left) + _this.host.offsetWidth > width) {
      _this.host.style.left = width - _this.host.offsetWidth + 'px';
    }
    if (parseInt(top) + _this.host.offsetHeight > height) {
      _this.host.style.top = height - _this.host.offsetHeight + 'px';
    }
  }

  private closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

export default GirafeDraggableElement;
