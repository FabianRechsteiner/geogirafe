import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import ArrowBlack from './images/arrow_black.webp';
import ArrowWhite from './images/arrow_white.webp';
import { systemIsInDarkMode } from '../../tools/utils/utils';

class HelpComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  content!: HTMLElement;
  themes!: HTMLElement;
  search!: HTMLElement;
  menu!: HTMLElement;
  basemap!: HTMLElement;
  userPreferences!: HTMLElement;

  darkFrontendMode: boolean = false;

  arrowBlack: string = ArrowBlack;
  arrowWhite: string = ArrowWhite;
  currentArrow?: string;

  public constructor() {
    super('help');
  }

  render() {
    super.render();
    this.content = this.shadow.querySelector('#content') as HTMLElement;
    // setting the images for the arrows with the imported files to use vite to serve them, because uhtml does somehow not render variables in css
    this.themes = this.shadow.querySelector('#themes') as HTMLElement;
    this.search = this.shadow.querySelector('#search') as HTMLElement;
    this.menu = this.shadow.querySelector('#menu') as HTMLElement;
    this.basemap = this.shadow.querySelector('#basemap') as HTMLElement;
    this.userPreferences = this.shadow.querySelector('#user-preferences') as HTMLElement;

    // hide help for hideable Parts of the UI
    if (!this.state.interface.basemapComponentVisible) {
      this.hideHelpFor('basemap');
    }
    if (!this.state.interface.searchComponentVisible) {
      this.hideHelpFor('search');
    }
  }

  private hideHelpFor(elementId: string): void {
    (this.shadow.querySelector(`#${elementId}`) as HTMLElement).style.display = 'none';
    (this.shadow.querySelector(`#${elementId}-description`) as HTMLElement).style.display = 'none';
  }

  registerEvents() {
    this.subscribe('interface.helpVisible', (_oldValue: boolean, newValue: boolean) => this.toggleHelp(newValue));
    this.subscribe('interface.darkFrontendMode', (_oldValue: boolean, newValue: boolean) => {
      this.darkFrontendMode = newValue ?? systemIsInDarkMode();
    });
    this.content.addEventListener('click', () => {
      this.state.interface.helpVisible = false;
    });
  }

  changeArrowColor() {
    // change the arrow color depending on the darkFrontendMode state
    this.darkFrontendMode = this.context.stateManager.state.interface.darkFrontendMode ?? systemIsInDarkMode();
    this.currentArrow = this.darkFrontendMode ? this.arrowBlack : this.arrowWhite;

    this.themes.style.backgroundImage = `url(${this.currentArrow})`;
    this.search.style.backgroundImage = `url(${this.currentArrow})`;
    this.menu.style.backgroundImage = `url(${this.currentArrow})`;
    this.basemap.style.backgroundImage = `url(${this.currentArrow})`;
    this.userPreferences.style.backgroundImage = `url(${this.currentArrow})`;

    this.content.style.backgroundColor = this.darkFrontendMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)';
  }

  toggleHelp(visible: boolean) {
    if (visible) {
      this.changeArrowColor();
      this.content.style.display = 'block';
    } else {
      this.content.style.display = 'none';
    }
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.render();
    super.girafeTranslate();
    this.registerEvents();
  }
}

export default HelpComponent;
