import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { InfoBoxContent } from '../../tools/state/state';

class InfoboxComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  infos = [] as InfoBoxContent[];

  urlRegExp = /(https?:\/\/[^"<]*?(?=\s|$|<\/[^a]>))/gi;

  // Each message can have a seperate timer or be persistent (until closed by user)
  private readonly autoCloseTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    super('infobox');
  }

  registerEvents() {
    this.subscribe('infobox.elements', () => {
      super.refreshRender();
      this.setupAutoClose();
    });
  }

  private setupAutoClose() {
    const elements: InfoBoxContent[] = this.state.infobox.elements ?? [];

    elements.forEach((info) => {
      const duration = info.duration;

      // No duration specified (persistent)
      if (!duration) {
        return;
      }

      if (this.autoCloseTimers.has(info.id)) {
        return;
      }

      const timerId = globalThis.setTimeout(() => {
        this.autoCloseTimers.delete(info.id);
        this.closeMessage(info);
      }, duration);

      this.autoCloseTimers.set(info.id, timerId);
    });
  }

  closeMessage(info: InfoBoxContent) {
    const timerId = this.autoCloseTimers.get(info.id);
    if (timerId !== undefined) {
      clearTimeout(timerId);
      this.autoCloseTimers.delete(info.id);
    }

    const index = this.state.infobox.elements.findIndex((el: InfoBoxContent) => el.id === info.id);

    if (index !== -1) {
      this.state.infobox.elements.splice(index, 1);
    }
  }

  linkify(str: string) {
    if (this.urlRegExp.test(str)) {
      return str.replaceAll(this.urlRegExp, '<a href="$1" target="_blank">$1</a>');
    }
    return str;
  }

  connectedCallback() {
    super.connectedCallback();
    super.render();
    super.girafeTranslate();
    this.registerEvents();
  }
}

export default InfoboxComponent;
