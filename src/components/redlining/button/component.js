import GeoEvents from '/models/events.js';

class ButtonComponent extends HTMLElement {

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
    const response = await fetch('/components/redlining/button/template.html');
    const content = await response.text();
    ButtonComponent.#template = document.createElement('template');
    ButtonComponent.#template.innerHTML = content;
  }

  render() {
    // Clone component template and add it to the dom
    this.shadow.appendChild(ButtonComponent.#template.content.cloneNode(true));
    this.button = this.shadow.querySelector('#button');
  }

  registerEvents() {

    this.button.addEventListener('click', (e) => this.displayToolbar(this, e));
  }

  displayToolbar(_this, e) {
    window.dispatchEvent(new CustomEvent(GeoEvents.Redlining, { 
      bubbles: true, cancelable: false, composed: true, 
      detail: {
        action: 'redliningToggled'
      }
    }));
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