import GeoEvents from '/models/events.js';
import GirafeHTMLElement from '/base/GirafeHTMLElement';

class MenuButtonComponent extends GirafeHTMLElement {

  button = null;
  icon = null;
  text = null;
  menuContent = null;
  
  constructor() {
    super('menubutton');
  }

  render() {
    super.render();
    this.button = this.shadow.querySelector('#button');
    this.menuContent = this.shadow.querySelector('#menu-content');

    if (this.hasAttribute('icon-style')) {
      // Add icon
      this.icon = document.createElement('i');
      this.icon.className = this.getAttribute('icon-style');
      this.button.appendChild(this.icon);
    }
    if (this.hasAttribute('text')) {
      // Add text
      this.text = document.createElement('span');
      this.text.innerHTML = this.getAttribute('text');
      this.button.appendChild(this.text);
    }

    this.setButtonStyle();
  }

  registerEvents() {
    this.button.addEventListener('click', (e) => this.openMenu());
  }

  setButtonStyle() {
    if (this.icon !== null && this.text !== null) {
      // If both icon and text were set, we need to adapt the style in order to make both visible
      this.button.className = "hybrid";
    }
  }

  setText(text) {
    if (this.text !== null && this.isNullOrUndefinedOrBlank(text)) {
      // Text exists and must be removed from button
      this.text.remove();
      this.text = null;
    }
    else if (this.text === null && !this.isNullOrUndefinedOrBlank(text)) {
      // text does not exists yet and has to be created
      this.text = document.createElement('span');
      this.text.innerHTML = text;
      // This function can be called before the component if full initialized
      // Therefore, we have to delay the execution, because this.button can still be null
      super.delayed(
        () => { return this.button !== null }, 
        () => this.button.appendChild(this.text)
      );
    }
    else {
      // Text already exists and has to be changed
      this.text.innerHTML = text;
    }
    this.setButtonStyle();
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