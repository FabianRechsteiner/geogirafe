import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { InfoBoxContent } from '../../tools/state/state';

class InfoboxComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  infos = [] as InfoBoxContent[];

  urlRegExp = /(https?:\/\/[^"<]*?(?=\s|$|<\/[^a]>))/gi;

  constructor() {
    super('infobox');
  }

  registerEvents() {
    this.subscribe('infobox.elements', () => super.refreshRender());
  }

  closeMessage(info: InfoBoxContent) {
    this.state.infobox.elements.splice(
      this.state.infobox.elements.findIndex((el) => el.id === info.id),
      1
    );
  }

  linkify(str: string) {
    if (this.urlRegExp.test(str)) {
      return str.replaceAll(this.urlRegExp, '<a href="$1" target="_blank">$1</a>');
    }
    return str;
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
