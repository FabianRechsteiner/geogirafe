// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import IGirafePanel from '../../tools/state/igirafepanel';

type LayoutType = '2D' | '3D' | '2D/3D';
const ALLOWED_LAYOUTS: LayoutType[] = ['2D', '3D', '2D/3D'];

class LayoutComponent extends GirafeHTMLElement implements IGirafePanel {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  isPanelVisible = false;
  panelTitle = 'layout-panel';
  panelTogglePath = 'interface.layoutPanelVisible';

  public constructor() {
    super('layout');
    this.onLayoutSelect = this.onLayoutSelect.bind(this);
    this.onShadowsToggle = this.onShadowsToggle.bind(this);
  }

  private registerEvents() {
    this.subscribe('globe.display', (_oldValue: string, newValue: string) =>
      this.onLayoutChanged(newValue as LayoutType)
    );
  }

  public togglePanel(visible: boolean) {
    this.isPanelVisible = visible;
    this.render();
    if (visible) {
      const currentLayout = this.state.globe.display as LayoutType;
      this.syncLayoutSelect(currentLayout);
      this.updateShadowsVisibility(currentLayout);
    }
  }

  private onLayoutSelect(event: Event) {
    const selectedLayout = (event.target as HTMLSelectElement)?.value as LayoutType;
    if (ALLOWED_LAYOUTS.includes(selectedLayout)) {
      this.state.globe.display = selectedLayout;
      return;
    }
    console.error(`${selectedLayout} is not a valid layout!`);
  }

  private onLayoutChanged(globe: LayoutType) {
    this.syncLayoutSelect(globe);
    if (this.isPanelVisible) {
      this.updateShadowsVisibility(globe);
    }
  }

  private syncLayoutSelect(layout: LayoutType) {
    const layoutSelect = this.shadowRoot?.querySelector('#layout') as HTMLSelectElement | null;
    if (layoutSelect) {
      layoutSelect.value = layout;
    }
  }

  private updateShadowsVisibility(globe: LayoutType) {
    const shadowsGroup = this.shadowRoot?.querySelector('.shadows-group') as HTMLElement;
    const shadowsDate = this.shadowRoot?.querySelector('.shadows-date') as HTMLElement;
    const shadowsCheckbox = this.shadowRoot?.querySelector('#shadowsCheckbox') as HTMLInputElement;
    const has3Dlayout = globe === '2D/3D' || globe === '3D';

    shadowsGroup?.classList.toggle('hidden', !has3Dlayout);
    shadowsDate?.classList.toggle('hidden', !has3Dlayout || !shadowsCheckbox?.checked);
  }

  private onShadowsToggle(event: Event) {
    const shadowsDate = this.shadowRoot?.querySelector('.shadows-date') as HTMLElement;
    const isChecked = (event.target as HTMLInputElement).checked;

    shadowsDate?.classList.toggle('hidden', !isChecked);
    this.state.globe.shadows = isChecked;

    if (isChecked) {
      this.setDateTimePicker();
    }
  }

  private setDateTimePicker() {
    const timeDatePicker = this.shadowRoot?.querySelector('#shadowsDate') as HTMLInputElement;

    if (timeDatePicker) {
      const date = new Date();
      timeDatePicker.valueAsNumber = Math.round((date.valueOf() - date.getTimezoneOffset() * 60000) / 60000) * 60000;
      timeDatePicker.addEventListener('input', () => {
        this.update3dMapTimestamp(new Date(timeDatePicker.value));
      });
    }
  }

  private update3dMapTimestamp(date: Date) {
    this.state.globe.shadowsTimestamp = date.valueOf();
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.render();
    this.registerEvents();
  }

  override render() {
    if (this.isPanelVisible) {
      super.render();
    } else {
      this.hide();
    }
    super.girafeTranslate();
  }
}

export default LayoutComponent;
