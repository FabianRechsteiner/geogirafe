import GeoEvents from '/models/events.js';
import GirafeHTMLElement from '/base/GirafeHTMLElement';

class MenuButtonComponent extends GirafeHTMLElement {

  static #template = null;

  button = null;
  menuContent = null;
  
  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
  }

  async loadTemplate() {
    if (MenuButtonComponent.#template !== null) {
      // Template was already loaded. Nothing to do.
      return;
    }
    // Otherwise, load the template
    const response = await fetch('/components/menubutton/template.html');
    const content = await response.text();
    MenuButtonComponent.#template = document.createElement('template');
    MenuButtonComponent.#template.innerHTML = content;
  }

  render() {
    // Clone component template and add it to the dom
    this.shadow.appendChild(MenuButtonComponent.#template.content.cloneNode(true));
    this.button = this.shadow.querySelector('#button');
    this.menuContent = this.shadow.querySelector('#menu-content');
  }

  registerEvents() {
    this.button.addEventListener('click', (e) => this.openMenu());
  }

  openMenu() {
    if (this.menuContent.style.display === 'block') {
      this.menuContent.style.display = 'none';
    }
    else {
      this.menuContent.style.display = 'block';
    }
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-menu-button', MenuButtonComponent);

export default MenuButtonComponent;