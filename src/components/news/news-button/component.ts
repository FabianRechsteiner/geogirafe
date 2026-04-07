import GirafeHTMLElement from '../../../base/GirafeHTMLElement';

class NewsButtonComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../../../styles/common.css'];

  visible: boolean = false;
  warn: boolean = false;

  constructor() {
    super('news-button');
  }

  setWarn() {
    this.warn = this.state.news.lastPublishDate > this.state.news.lastViewDate;

    if (this.context.configManager.Config.news?.autoDisplay && this.warn) {
      this.state.interface.newsPanelVisible = true;
    }

    super.render();
  }

  loadLastViewDate() {
    const lastViewDate = this.context.userDataManager.getUserData('lastViewDate') as number;
    if (lastViewDate) {
      this.context.stateManager.state.news.lastViewDate = lastViewDate;
    }
  }

  getIcon() {
    const icon = this.warn ? 'icons/bell-warn.svg' : 'icons/bell.svg';
    return icon;
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (this.context.configManager.Config.news) {
      this.subscribe('news.lastViewDate', (_oldValue: number, _newValue: number) => {
        this.setWarn();
      });
      this.subscribe('news.lastPublishDate', (_oldValue: number, _newValue: number) => {
        this.setWarn();
      });
      super.girafeTranslate();
    }
  }
}

export default NewsButtonComponent;
