import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class ColorSwitcherComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = '../../styles/common.css';

  constructor() {
    super('colorswitcher');
  }

  registerEvents() {
    this.subscribe('interface.darkFrontendMode', (_, newValue) => this.onChangeDarkFrontendMode(newValue));
    this.subscribe('interface.darkMapMode', () => super.refreshRender());
  }

  onChangeDarkFrontendMode(newValue: boolean | undefined) {
    const themeIsDark = newValue ?? this.systemIsInDarkMode();
    const currentTheme = themeIsDark ? 'dark' : 'light';
    this.activateTheme(currentTheme);
    super.refreshRender();
  }

  initValue() {
    const config = this.configManager.Config.interface.darkFrontendMode;
    this.state.interface.darkFrontendMode = config ?? this.systemIsInDarkMode();
    this.state.interface.darkMapMode = this.configManager.Config.interface.darkMapMode;
  }

  systemIsInDarkMode(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
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
