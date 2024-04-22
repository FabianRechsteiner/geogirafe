import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import MenuButtonComponent from '../menubutton/component';
import Icon2D from './images/map-2d.svg';
import Icon3D from './images/map-3d.svg';
import IconSplit from './images/map-split.svg';
import IconGlobe from './images/globe.svg';

class GlobeComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';
  public icon2D: string = Icon2D;
  public icon3D: string = Icon3D;
  public iconSplit: string = IconSplit;
  public iconGlobe: string = IconGlobe;

  #menuButton?: MenuButtonComponent;

  constructor() {
    super('globe');
  }

  get menuButton() {
    if (!this.#menuButton) {
      throw new Error('You called menuButton before render');
    }
    return this.#menuButton;
  }

  render() {
    super.render();
    this.#menuButton = this.shadow.querySelector('#menu-button')!;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
    });
  }
}

export default GlobeComponent;
