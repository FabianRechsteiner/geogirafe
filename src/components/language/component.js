import GeoEvents from '/models/events.js';
import GirafeHTMLElement from '/base/GirafeHTMLElement';

class LanguageComponent extends GirafeHTMLElement {

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
    this.languageSelect.addEventListener('change', (e) => this.onLanguageChanged(this, e));
  }

  // onInitEvent(details) {
  //   if (details.action === 'initState') {
  //     if (details.state.projection !== 'null') {
  //       this.languageSelect.value = details.state.projection;
  //     }
  //   }
  // }

  onLanguageChanged(_this, e) {
    _this.messageManager.sendMessage(GeoEvents.Translate, {action: 'languageChanged', language: e.target.value});
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
      this.initialized();
    });
  }

  initialized() {
    this.messageManager.sendMessage(GeoEvents.Init, {action: 'componentInitialized'});
  }
}

customElements.define('girafe-language-select', LanguageComponent);

export default LanguageComponent;