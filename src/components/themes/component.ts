import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import Theme from '../../models/theme';
import MapManager from '../../tools/state/mapManager.ts';

class ThemeComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  #themesList?: HTMLUListElement;
  #ignoreBlur = false;
  private readonly mapManager: MapManager;

  constructor() {
    super('themes');
    this.mapManager = MapManager.getInstance();
  }

  get themesList() {
    if (!this.#themesList) {
      throw new Error('You called themesList before render');
    }
    return this.#themesList;
  }

  render() {
    super.render();

    this.#themesList = this.shadow.querySelector('#themes')!;
    this.toggleThemesList(false);
  }

  registerEvents() {
    this.stateManager.subscribe('loading', () => super.render());
    this.stateManager.subscribe('themes', () => {
      super.render();
      super.girafeTranslate();
    });
  }

  onBlur() {
    if (!this.#ignoreBlur) {
      this.toggleThemesList(false);
    }
  }

  toggleThemesList(forceDisplay: null | boolean = null) {
    if (forceDisplay === true) {
      this.themesList.style.display = 'block';
    } else if (forceDisplay === false) {
      this.themesList.style.display = 'none';
    } else if (this.themesList.style.display === 'none') {
      this.themesList.style.display = 'block';
    } else {
      this.themesList.style.display = 'none';
    }
  }

  ignoreBlur() {
    this.#ignoreBlur = true;
  }

  onThemeChanged(theme: Theme) {
    this.state.selectedTheme = theme;
    this.toggleThemesList(false);
    this.#ignoreBlur = false;

    if (theme.location != null || theme.zoom != null) {
      const view = this.mapManager.getMap().getView();
      view.animate({
        center: theme.location ?? view.getCenter(),
        zoom: theme.zoom ?? view.getZoom(),
        duration: 1000
      });
    }
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.registerEvents();
    });
  }
}

export default ThemeComponent;
