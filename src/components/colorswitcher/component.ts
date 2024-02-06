import GirafeHTMLElement from '../../base/GirafeHTMLElement';

// https://css-tricks.com/a-complete-guide-to-dark-mode-on-the-web/

enum Toggle {
  toggle = 'toggle',
  replace = 'replace'
}

enum Mode {
  light = 'light',
  dark = 'dark'
}

class ColorSwitcherComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  frontendColorSwitcher!: HTMLInputElement;
  mapColorSwitcher!: HTMLInputElement;

  // Select the theme preference from localStorage
  currentTheme: string | null = localStorage.getItem('theme');

  constructor() {
    super('colorswitcher');
  }

  render() {
    super.render();
    this.frontendColorSwitcher = this.shadow.querySelector('#frontendColorSwitcher') as HTMLInputElement;
    this.mapColorSwitcher = this.shadow.querySelector('#mapColorSwitcher') as HTMLInputElement;
    this.activateTooltips(false, [800, 0], 'top-end');
  }

  registerEvents() {
    this.stateManager.subscribe('interface.darkFrontendMode', () => this.onChangeDarkFrontendMode());
    this.stateManager.subscribe('interface.darkMapMode', () => this.onChangeDarkFrontendMode());
  }

  toggleClassList(val: boolean) {
    if (!val) {
      this.activateThemeMode(Mode.light, Toggle.replace);
    } else {
      this.activateThemeMode(Mode.dark, Toggle.replace);
    }
  }

  onChangeDarkFrontendMode() {
    // Interface
    const theme = this.state.interface.darkFrontendMode ? 'dark' : 'light';
    this.toggleClassList(this.state.interface.darkFrontendMode);
    this.frontendColorSwitcher.checked = this.state.interface.darkFrontendMode;
    localStorage.setItem('theme', theme);

    // Map
    this.mapColorSwitcher.checked = this.state.interface.darkMapMode;
  }

  initValue() {
    // In case the user has changed it already it's saved to local storage, let's reflect that in the UI
    if (this.currentTheme === 'dark') {
      this.activateThemeMode(Mode.dark, Toggle.toggle);
    } else if (this.currentTheme === 'light') {
      this.activateThemeMode(Mode.light, Toggle.toggle);
    } else {
      // If they haven't been explicit, let's check the media query
      const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
      if (prefersDarkScheme.matches) {
        this.activateThemeMode(Mode.dark, Toggle.toggle);
      } else {
        this.activateThemeMode(Mode.light, Toggle.toggle);
      }
    }
  }

  activateThemeMode(mode: Mode, toggle: Toggle) {
    // ...apply the .dark-theme class to override the default light styles

    if (toggle === Toggle.toggle) {
      document.body.classList.toggle(`${mode}-theme`);
    } else {
      const otherMode = mode === Mode.dark ? Mode.light : Mode.dark;
      document.body.classList.replace(`${otherMode}-theme`, `${mode}-theme`);
    }
    this.state.interface.darkFrontendMode = mode === Mode.dark;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.girafeTranslate();
      this.registerEvents();
      this.initValue();
    });
  }
}

export default ColorSwitcherComponent;
