import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class ColorSwitcherComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = '../../styles/common.css';

  constructor() {
    super('colorswitcher');
  }

  registerEvents() {
    this.subscribe('interface.darkFrontendMode', () => this.onChangeDarkFrontendMode());
    this.subscribe('interface.darkMapMode', () => super.refreshRender());
  }

  onChangeDarkFrontendMode() {
    const currentTheme = this.state.interface.darkFrontendMode ? 'dark' : 'light';
    this.activateTheme(currentTheme);
    localStorage.setItem('theme', currentTheme);
    super.refreshRender();
  }

  initValue() {
    let currentTheme = localStorage.getItem('theme');
    if (!currentTheme) {
      const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
      currentTheme = prefersDarkScheme.matches ? 'dark' : 'light';
    }
    this.state.interface.darkFrontendMode = currentTheme === 'dark';
  }

  activateTheme(mode: 'dark' | 'light') {
    const otherMode = mode === 'dark' ? 'light' : 'dark';
    document.body.classList.remove(`${otherMode}-theme`);
    document.body.classList.add(`${mode}-theme`);
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      super.render();
      this.girafeTranslate();
      this.registerEvents();
      this.initValue();
    });
  }
}

export default ColorSwitcherComponent;
