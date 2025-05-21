import type { Callback } from '../../../tools/state/statemanager';
import type MapContextMenuComponent from '../component';

import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import I18nManager from '../../../tools/i18n/i18nmanager';

class MapCustomContextMenuContentComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../style.css', '../../../styles/common.css'];

  i18nManager: I18nManager;
  private readonly eventsCallbacks: Callback[] = [];
  private readonly container!: MapContextMenuComponent;

  constructor() {
    super('custom-context-menu-content');
    this.i18nManager = I18nManager.getInstance();
  }

  async renderComponent() {
    super.render();
    super.girafeTranslate();
    this.activateTooltips(false, [800, 0], 'top-end');
  }

  registerEvents() {
    this.eventsCallbacks.push(
      this.subscribe('language', (_oldVal: string, _newVal: string) => {
        console.debug(`Language changed from: ${_oldVal} to: ${_newVal}`);
        super.render();
        super.girafeTranslate();
      })
    );
  }

  unregisterEvents(): void {
    this.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;
  }

  closeMenu() {
    this.container.hideContextMenu('custom-overlay');
    this.unregisterEvents();
  }

  async connectedCallback() {
    await this.loadConfig();
    this.renderComponent();
    this.registerEvents();
  }
}

export default MapCustomContextMenuContentComponent;
