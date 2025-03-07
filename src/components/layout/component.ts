import GirafeHTMLElement from '../../base/GirafeHTMLElement';

type LayoutType = '2D' | '3D' | '2D/3D';
const ALLOWED_LAYOUTS: LayoutType[] = ['2D', '3D', '2D/3D'];

class LayoutComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  visible = false;

  constructor() {
    super('layout');
    this.onLayoutSelect = this.onLayoutSelect.bind(this);
    this.onShadowsToggle = this.onShadowsToggle.bind(this);
  }

  private registerEvents() {
    this.subscribe('interface.layoutPanelVisible', (_oldValue: boolean, newValue: boolean) =>
      this.togglePanel(newValue)
    );
    this.subscribe('globe.display', (_oldValue: string, newValue: string) => this.onLayoutChanged(newValue));
  }

  private togglePanel(visible: boolean) {
    this.visible = visible;
    this.render();
  }

  private onLayoutSelect(event: Event) {
    const selectedLayout = (event.target as HTMLSelectElement)?.value as LayoutType;
    if (ALLOWED_LAYOUTS.includes(selectedLayout)) {
      this.state.globe.display = selectedLayout;
      return;
    }
    console.error(`${selectedLayout} is not a valid layout!`);
  }

  private onLayoutChanged(globe: string) {
    if (this.visible) {
      const shadowsOption = this.shadowRoot?.querySelector('.shadows-option') as HTMLElement;

      if (shadowsOption) {
        const has3Dlayout = globe === '2D/3D' || globe === '3D';
        shadowsOption.classList.toggle('hidden', !has3Dlayout);
      }
    }
  }

  private onShadowsToggle(event: Event) {
    const shadowsDate = this.shadowRoot?.querySelector('.shadows-date') as HTMLElement;

    if (shadowsDate) {
      const isChecked = (event.target as HTMLInputElement).checked;

      shadowsDate.classList.toggle('hidden', !isChecked);
      this.state.globe.shadows = isChecked;

      if (isChecked) {
        this.setDateTimePicker();
      }
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

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.registerEvents();
    });
  }

  render() {
    this.visible ? super.render() : this.hide();
    super.girafeTranslate();
  }
}

export default LayoutComponent;
