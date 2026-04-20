// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import Layer from '../../../models/layers/layer';

class MobileLayerElementComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.mobile.css', './style.css'];

  protected layer?: Layer;

  static readonly observedAttributes: string[] = [];

  public constructor(name?: string) {
    super(name ?? 'layer-mobile');
  }

  registerEvents() {
    this.subscribe(/layers\.layersList\..*\.activeState/, (_oldValue: boolean, _newValue: boolean, layer: Layer) => {
      if (this.layer === layer) {
        super.refreshRender();
      }
    });
  }

  override render() {
    super.render();
    this.refreshGroup();
  }

  public toggle() {
    if (this.layer) {
      this.context.layerManager.toggleLayer(this.layer);
    }
  }

  private refreshGroup() {
    const layerid = this.getAttribute('layerid');
    if (layerid) {
      this.layer = this.context.layerManager.getTreeItem(layerid) as Layer;
    }
    super.refreshRender();
  }

  protected override connectedCallback(): void {
    super.connectedCallback();
    MobileLayerElementComponent.observedAttributes.push('layerid');
    this.registerEvents();
    this.render();
  }

  attributeChangedCallback(name: string) {
    if (name === 'layerid') {
      this.refreshGroup();
    }
  }
}

export default MobileLayerElementComponent;
