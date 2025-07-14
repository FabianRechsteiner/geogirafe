import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import MapManager from '../../tools/state/mapManager';

export default class AlignNorthButtonMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  constructor() {
    super('align-north-button-mobile');
  }

  connectedCallback() {
    this.render();
    const compassIcon = this.shadow.getElementById('compass-icon') as HTMLImageElement;
    const map = MapManager.getInstance().getMap();

    map.once('postrender', () => {
      const view = map.getView();
      view.on('change:rotation', () => {
        const rotation = view.getRotation();
        compassIcon.style.setProperty('transform', `rotate(${rotation}rad)`);

        if (Math.abs(rotation) < 0.005) {
          compassIcon.classList.remove('black-to-red');
        } else {
          compassIcon.classList.add('black-to-red');
        }
      });
    });
  }

  alignNorth(e: PointerEvent) {
    MapManager.getInstance().getMap().getView().animate({ rotation: 0, duration: 500 });
    (e.target as HTMLButtonElement).blur();
  }
}
