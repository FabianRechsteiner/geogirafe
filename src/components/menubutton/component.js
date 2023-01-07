import GeoEvents from '/models/events.js';
import GirafeHTMLElement from '/base/GirafeHTMLElement';

class MenuButtonComponent extends GirafeHTMLElement {

  button = null;
  icon = null;
  text = null;
  textSpan = null;
  menuContent = null;
  
  constructor() {
    super('menubutton');
  }

  render() {
    super.render();
    this.button = this.shadow.querySelector('#button');
    this.menuContent = this.shadow.querySelector('#menu-content');

    let direction = (this.hasAttribute('open')) ? this.getAttribute('open') : 'bottom';
    this.setOpenDirection(direction);

    if (this.hasAttribute('icon-style')) {
      // Add icon
      this.icon = document.createElement('i');
      this.icon.className = this.getAttribute('icon-style');
      this.button.appendChild(this.icon);
    }
    if (this.hasAttribute('text')) {
      // Add text
      this.text = this.getAttribute('text');
      this.textSpan = document.createElement('span');
      this.textSpan.innerHTML = this.text;
      this.button.appendChild(this.textSpan);
    }

    this.setButtonStyle();
  }

  setOpenDirection(direction) {
    switch(direction) {
      case 'left':
        this.menuContent.classList.add('open-left');
        break;
      default:
        this.menuContent.classList.add('open-bottom');
        break;
    }
  }

  registerEvents() {
    this.button.addEventListener('click', (e) => this.openMenu());
    this.menuContent.addEventListener('blur', (e) => this.onBlur(e));
  }

  setButtonStyle() {
    if (this.icon !== null && this.textSpan !== null) {
      // If both icon and text were set, we need to adapt the style in order to make both visible
      this.button.className = "hybrid";
    }
  }

  setText(text) {
    if (this.textSpan !== null && this.isNullOrUndefinedOrBlank(text)) {
      // Text exists and must be removed from button
      this.text = null;
      this.textSpan.remove();
      this.textSpan = null;
    }
    else if (this.textSpan === null && !this.isNullOrUndefinedOrBlank(text)) {
      // text does not exists yet and has to be created
      this.text = text;
      this.textSpan = document.createElement('span');
      this.textSpan.innerHTML = this.text;
      if (this.button !== null) {
        this.button.appendChild(this.textSpan)
      }
      else {
        // This function can be called before the component if full initialized
        // Therefore, we have to delay the execution, because this.button can still be null
        super.delayed(
          () => { return this.button !== null }, 
          () => this.button.appendChild(this.textSpan)
        );
      }
    }
    else {
      // Text already exists and has to be changed
      this.text = text;
      this.textSpan.innerHTML = this.text;
    }
    this.setButtonStyle();
  }

  openMenu() {
    if (this.menuContent.style.display === 'block') {
      this.closeMenu();
    }
    else {
      this.menuContent.style.display = 'block';
      this.focusContent();
    }
  }

  focusContent() {
    this.menuContent.focus();
  }

  closeMenu() {
    this.menuContent.style.display = 'none';
    // If one of the parents is another menu-button, we give the focus to it
    const parentMenuButton = this.getParentMenuButton(this.shadow.host.parentNode);
    if (parentMenuButton !== null) {
      parentMenuButton.focusContent();
    }
  }

  onBlur(e) {
    if (e.relatedTarget === this.button) {
      // We clicked on the menu button.
      // => nothing to do, the menu will be close by the click event
      return;
    }
    if (!this.contains(e.currentTarget, e.relatedTarget)) {
      // The new focused element is not a child of the menuContent
      // => We close the menu
      this.closeMenu();
    }
  }

  getParentMenuButton(elem) {
    // Stop case : we found null or a menu-button object
    if (elem === null || elem.nodeName === 'GIRAFE-MENU-BUTTON') {
      return elem;
    }

    // Otherwise, we try to find a perent recursively
    let parent = null;
    if (elem instanceof ShadowRoot) {
      parent = elem.host;
    }
    else {
      parent = elem.parentNode;
    }

    return this.getParentMenuButton(parent);
  }

  contains(parent, child) {
    // This method returns true if the parent contains the child
    // The tests are made by tesing all childs, resursively including childs present in slots
    if (parent.contains(child)) {
      // Simple HTML, simple case
      return true;
    }

    // Otherwise, we check the elements in slots
    const slot = parent.querySelector('slot[name="menu-content"]');
    const elements = slot.assignedElements({flatten: true});
    for (let i=0; i<elements.length; ++i) {
      if (elements[i].contains(child)) {
        return true;
      }
    }

    // Not found => not a child
    return false;
  }

  connectedCallback() {
    super.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-menu-button', MenuButtonComponent);

export default MenuButtonComponent;