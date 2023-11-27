import GirafeHTMLElement from '../../base/GirafeHTMLElement.ts';
import Statemanager from '../../tools/state/statemanager.ts';

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

  colorswitcherContainer!: HTMLElement;
  colorswitchSwitcher!: HTMLElement;
  header!: HTMLElement;

  // Select the theme preference from localStorage
  currentTheme: string | null = localStorage.getItem('theme');

  constructor() {
    super('colorswitcher');
  }

  render() {
    super.render();
    this.colorswitcherContainer = this.shadow.querySelector('#colorswitcherContainer') as HTMLElement;
    this.colorswitchSwitcher = this.shadow.querySelector('#colorswitchSwitcher') as HTMLElement;
  }

  getHeader() {
    this.header = this.shadow.querySelector('body') as HTMLElement;
  }

  registerEvents() {
    this.colorswitchSwitcher.addEventListener('click', () => this.toggleDarkFrontendMode());
  }

  toggleClassList(val: boolean) {
    if (!val) {
      this.activateThemeMode(Mode.light, Toggle.replace);
    } else {
      this.activateThemeMode(Mode.dark, Toggle.replace);
    }
  }

  toggleDarkFrontendMode() {
    let clrSchema = Statemanager.getInstance().state.interface.darkFrontendMode;
    clrSchema = !clrSchema;
    Statemanager.getInstance().state.interface.darkFrontendMode = clrSchema;

    let theme = 'light';

    if (clrSchema) {
      theme = 'dark';
    }
    this.toggleClassList(clrSchema);
    localStorage.setItem('theme', theme);
  }

  initValue() {
    // In case the user has changed it already it's saved to local storage, let's reflect that in the UI
    if (this.currentTheme != undefined && this.currentTheme === 'dark') {
      this.activateThemeMode(Mode.dark, Toggle.toggle);
      return;
    } else if (this.currentTheme != undefined && this.currentTheme === 'light') {
      this.activateThemeMode(Mode.light, Toggle.toggle);
      return;
    }

    // If they haven't been explicit, let's check the media query
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    if (prefersDarkScheme.matches) {
      this.activateThemeMode(Mode.dark, Toggle.toggle);
    } else {
      this.activateThemeMode(Mode.light, Toggle.toggle);
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
    Statemanager.getInstance().state.interface.darkFrontendMode = mode === Mode.dark ? true : false;

    if (mode === Mode.dark) {
      (<HTMLImageElement>document.body.querySelector('#logo'))!.src = 'images/logo_black_small.webp';
    } else {
      (<HTMLImageElement>document.body.querySelector('#logo'))!.src = 'images/logo_small.webp';
    }
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.girafeTranslate();
      this.registerEvents();

      this.getHeader();
      this.initValue();
    });
  }
}

export default ColorSwitcherComponent;
