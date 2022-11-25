import GeoEvents from '/models/events.js';
import GirafeHTMLElement from '/base/GirafeHTMLElement';

class ButtonComponent extends GirafeHTMLElement {

  static #template = null;

  button = null;
  
  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
  }

  async loadTemplate() {
    if (ButtonComponent.#template !== null) {
      // Template was already loaded. Nothing to do.
      return;
    }
    // Otherwise, load the template
    const response = await fetch('/components/button/template.html');
    const content = await response.text();
    ButtonComponent.#template = document.createElement('template');
    ButtonComponent.#template.innerHTML = content;
  }

  render() {
    // Clone component template and add it to the dom
    this.shadow.appendChild(ButtonComponent.#template.content.cloneNode(true));
    this.button = this.shadow.querySelector('#button');

    const iconStyle = this.getAttribute('icon-style');
    this.button.className = iconStyle;
  }

  registerEvents() {
    const message = this.getAttribute('message');
    const geoevent = this.getGeoEventType(message);
    const action = this.getAttribute('action');
    this.button.addEventListener('click', (e) => this.messageManager.sendMessage(geoevent, {action: action}));
  }

  getGeoEventType(message) {
    switch(message) {
      case 'RedLining':
        return GeoEvents.RedLining;
      case 'TreeView':
        return GeoEvents.TreeView;
      case 'Map':
        return GeoEvents.Map;
      case 'App':
        return GeoEvents.App;
      case 'Theme':
        return GeoEvents.Theme;
      case 'Init':
        return GeoEvents.Init;
      case 'Translate':
        return GeoEvents.Translate;
      case 'Redlining':
        return GeoEvents.Redlining;
    }
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-button', ButtonComponent);

export default ButtonComponent;