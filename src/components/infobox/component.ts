import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { InfoBoxContent } from '../../tools/state/state';

class InfoboxComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  infos = [] as InfoBoxContent[];

  constructor() {
    super('infobox');
  }

  registerEvents() {
    this.subscribe('infobox.elements', () => super.render());
  }

  closeMessage(info: InfoBoxContent) {
    this.state.infobox.elements.splice(
      this.state.infobox.elements.findIndex((el) => el.id === info.id),
      1
    );
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      super.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }
}

export default InfoboxComponent;
