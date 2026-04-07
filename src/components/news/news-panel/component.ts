import type { FeedEntry } from './newsfeedutils';

import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import IGirafePanel from '../../../tools/state/igirafepanel';
import { loadFeeds } from './newsfeedutils';

class NewsPanelComponent extends GirafeHTMLElement implements IGirafePanel {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../../../styles/common.css'];

  isPanelVisible = false;
  panelTitle = 'news';
  panelTogglePath = 'interface.newsPanelVisible'; // Subscribes to changes in the state manager's newsPanelVisible property

  entries: FeedEntry[] = [];

  constructor() {
    super('news-panel');
  }

  saveLastViewDate() {
    const currentTimestamp = Date.now();
    this.context.userDataManager.saveUserData('lastViewDate', currentTimestamp);
    this.context.stateManager.state.news.lastViewDate = currentTimestamp;
  }

  loadLastViewDate() {
    const raw = this.context.userDataManager.getUserData('lastViewDate');
    const lastViewDate = Number(raw);
    this.context.stateManager.state.news.lastViewDate = Number.isFinite(lastViewDate) ? lastViewDate : 0;
  }

  public togglePanel(visible: boolean) {
    this.isPanelVisible = visible;
    if (visible) {
      this.saveLastViewDate();
    }
    this.render();
  }

  render() {
    if (this.isPanelVisible) {
      super.render();
    } else {
      this.hide();
    }
    super.girafeTranslate();
  }

  private async initializeNewsState() {
    if (!this.context.configManager.Config.news) {
      return;
    }

    this.loadLastViewDate();

    const urls = this.context.configManager.Config.news.urls;
    this.entries = await loadFeeds(urls);

    // Update state manager
    const lastPublishDate = this.entries.length > 0 ? (this.entries[0].date?.getTime() ?? 0) : 0;
    this.context.stateManager.state.news.lastPublishDate = lastPublishDate;
  }

  protected override connectedCallback() {
    super.connectedCallback();
    if (this.context.configManager.Config.news) {
      void this.initializeNewsState();
      this.render();
    }
  }
}

export default NewsPanelComponent;
