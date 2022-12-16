import GeoEvents from '/models/events.js';
import GirafeHTMLElement from '/base/GirafeHTMLElement';

class MenuButtonComponent extends GirafeHTMLElement {

  button = null;
  menuContent = null;
  
  constructor() {
    super('menubutton');
  }

  render() {
    super.render();
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
    super.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-menu-button', MenuButtonComponent);

export default MenuButtonComponent;