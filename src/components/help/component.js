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
    this.stateManager.subscribe('interface.helpVisible', (oldValue, newValue) => this.toggleHelp(newValue));
    this.content.addEventListener('click', () => { this.state.interface.helpVisible = false });
  }

  toggleHelp(visible) {
    if (visible) {
      this.content.style.display = 'block';
    }
    else {
      this.content.style.display = 'none';
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
