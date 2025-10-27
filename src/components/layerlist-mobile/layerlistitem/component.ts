import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import type Layer from '../../../models/layers/layer';

export default class LayerListItemMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.css', './style.css'];
  public layer!: Layer;
  public expanded = false;

  constructor() {
    super('layer-list-element-mobile');
  }

  connectedCallback() {
    super.connectedCallback();
    // The component needs to wait for the list of layers to be available
    this.subscribe('layers.layersList', (_oldValue: Layer, _newValue: Layer) => {
      const layerId = this.getAttribute('layerid');
      if (!layerId) {
        return;
      }

      this.layer = this.context.layerManager.getTreeItem(layerId) as Layer;
      this.render();
    });

    // Toggle to dark mode when needed
    this.subscribe('interface.darkFrontendMode', (_waDarkMode: boolean, isDarkMode: boolean) => {
      const container = this.shadow.getElementById('layer-button') as HTMLDivElement;

      if (isDarkMode) {
        container.classList.add('dark-mode');
      } else {
        container.classList.remove('dark-mode');
      }
    });
  }

  toggle(state?: 'on' | 'off') {
    if (!this.layer) return;

    this.context.layerManager.toggleLayer(this.layer, state);
    this.render();
  }

  setOpacity(e: PointerEvent) {
    e.stopPropagation();
    if (!this.layer) return;
    if (!this.layer.active) {
      this.toggle('on');
    }
    this.layer.opacity = Number.parseFloat((e.target as HTMLInputElement).value);
  }

  toggleExpand(e: Event) {
    e.stopPropagation();
    this.expanded = !this.expanded;
    this.render();
  }
}
