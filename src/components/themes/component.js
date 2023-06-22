import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class ThemeComponent extends GirafeHTMLElement {

  themesButton = null;
  layerIcon = null;
  waitingIcon = null;
  themesList = null;
  themesJson = {};
  themes = [];
  ignoreBlur = false;

  constructor() {
    super('themes');
  }

  render() {
    super.render();

    this.themesButton = this.shadow.querySelector('#select');
    this.themesButton.onclick = () => this.toggleThemesList();
    this.themesButton.onblur =  () => this.onBlur();

    this.layerIcon = this.shadow.querySelector('#icon');
    this.waitingIcon = this.shadow.querySelector('#waiting');

    this.themesList = this.shadow.querySelector('#themes');
    this.toggleThemesList(false);
  }

  registerEvents() {
    this.stateManager.subscribe('loading', (oldValue, newValue) => this.onLoading(newValue));
    this.stateManager.subscribe('themes', (oldThemes, newThemes) => this.onThemesLoaded(newThemes));
  }

  onThemesLoaded(themes) {
    // Add options from themes
    Object.values(themes).forEach(theme => {
      this.addOption(theme);
    });
    super.translate();
  }

  onBlur() {
    if (!this.ignoreBlur) {
      this.toggleThemesList(false);
    }
  }

  toggleThemesList(forceDisplay=null) {
    if (forceDisplay === true) {
      this.themesList.style.display = 'block';
    }
    else if (forceDisplay === false) {
      this.themesList.style.display = 'none';
    }

    else if (this.themesList.style.display === 'none') {
      this.themesList.style.display = 'block';
    }
    else {
      this.themesList.style.display = 'none';
    }
  }

  addOption(theme) {
    // Create new theme option
    const option = document.createElement('div');

    const img = document.createElement('img');
    img.src = theme.icon;
    option.appendChild(img);

    const span = document.createElement('span');
    span.innerHTML = theme.name;
    span.setAttribute('i18n', theme.name);
    option.appendChild(span);

    option.dataset['value'] = theme.id;
    // Ignore blur on mouse down to prevent themes from de-rendering before we can process click
    option.onmousedown = () => { this.ignoreBlur = true };
    option.onclick = (e) => this.onThemeChanged(e);

    // Add to select
    this.themesList.appendChild(option);
  }

  onLoading(loading) {
    if (loading) {
      this.layerIcon.style.display = 'none';
      this.waitingIcon.style.display = 'block';
    }
    else {
      this.layerIcon.style.display = 'block';
      this.waitingIcon.style.display = 'none';
    }
  }

  onThemeChanged(e) {
    const div = super.getParentOfType('DIV', e.target);
    const id = parseInt(div.dataset["value"]);
    const themes = this.state.themes;

    for (const index in themes) {
      if (themes.hasOwnProperty(index)) {
        const theme = themes[index];
        if (theme.id === id) {
          this.state.selectedTheme = theme;
          break;
        }
      }
    }

    this.toggleThemesList(false);
    this.ignoreBlur = false;
  }

  connectedCallback() {
    this.loadTemplate()
      .then(() => {
        this.render();
        this.registerEvents();
      });
  }
}

customElements.define('girafe-theme-select', ThemeComponent);

export default ThemeComponent;
