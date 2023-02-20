import GeoEvents from '../../models/events.js';
import GirafeHTMLElement from '../../base/GirafeHTMLElement.js';

class HelpComponent extends GirafeHTMLElement {

  content = null;

  constructor() {
    super('help');
  }

  render() {
    super.render();
    this.content = this.shadow.querySelector('#content');
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));

    this.content.addEventListener('click', () => this.closeHelp());
  }

  closeHelp() {
    this.content.style.display = 'none';
  }

  showHelp() {
    this.content.style.display = 'block';
  }

  onMapEvent(details) {
    if (details.action === 'help') {
      this.showHelp();
    }
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      super.translate();
      this.registerEvents();
      //super.initialized();
    });
  }
}

customElements.define('girafe-help', HelpComponent);

export default HelpComponent;
