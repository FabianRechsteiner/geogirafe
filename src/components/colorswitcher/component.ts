import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class ColorSwitcherComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  private currentTheme?: 'light' | 'dark';

  constructor() {
    super('colorswitcher');
  }

  registerEvents() {
    this.stateManager.subscribe('interface.darkFrontendMode', () => this.onChangeDarkFrontendMode());
    this.stateManager.subscribe('interface.darkMapMode', () => super.render());
  }

  onChangeDarkFrontendMode() {
    this.currentTheme = this.state.interface.darkFrontendMode ? 'dark' : 'light';
    this.activateTheme(this.currentTheme);
    super.render();
  }

  darkFrontendModeToggled() {
    this.state.interface.darkFrontendMode = !this.state.interface.darkFrontendMode;
    localStorage.setItem('theme', this.currentTheme!);
  }

  initValue() {
    this.currentTheme = (localStorage.getItem('theme') as 'dark' | 'light') ?? undefined;
    if (!this.currentTheme) {
      const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
      this.currentTheme = prefersDarkScheme.matches ? 'dark' : 'light';
    }

    this.state.interface.darkFrontendMode = this.currentTheme === 'dark';
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
      this.activateTooltips(false, [800, 0], 'top-end');
      this.initValue();
    });
  }
}

export default ColorSwitcherComponent;
