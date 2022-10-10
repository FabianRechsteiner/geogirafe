import GeoEvents from '/models/events.js';

class LanguageComponent extends HTMLElement {

  static #template = null;

  languageSelect = null;
  
  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
  }

  async loadTemplate() {
    if (LanguageComponent.#template !== null) {
      // Template was already loaded. Nothing to do.
      return;
    }
    // Otherwise, load the template
    const response = await fetch('/components/language/template.html');
    const content = await response.text();
    LanguageComponent.#template = document.createElement('template');
    LanguageComponent.#template.innerHTML = content;
  }

  render() {
    // Clone component template and add it to the dom
    this.shadow.appendChild(LanguageComponent.#template.content.cloneNode(true));
    this.languageSelect = this.shadow.querySelector('#language');
  }

  registerEvents() {
    //window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
    this.languageSelect.addEventListener('change', this.onLanguageChanged);
  }

  // onInitEvent(details) {
  //   if (details.action === 'initState') {
  //     if (details.state.projection !== 'null') {
  //       this.languageSelect.value = details.state.projection;
  //     }
  //   }
  // }

  onLanguageChanged(e) {
    console.log(e.target.value);
    window.dispatchEvent(new CustomEvent(GeoEvents.Translate, { 
      bubbles: true, cancelable: false, composed: true, 
      detail: {
        action: 'languageChanged',
        language: e.target.value
      }
    }));
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
      this.initialized();
    });
  }

  initialized() {
    window.dispatchEvent(new CustomEvent(GeoEvents.Init, { 
      bubbles: true, cancelable: false, composed: true, 
      detail: {
        action: 'componentInitialized'
      }
    }));
  }
}

customElements.define('girafe-language-select', LanguageComponent);

export default LanguageComponent;