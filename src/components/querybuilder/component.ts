import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import LayerWms from '../../models/layers/layerwms';
import WfsManager from '../../tools/wfsmanager';
import { LayerAttribute } from '../../models/serverwfs';
import FilterHelper from './tools/filterhelper';

class QueryBuilderComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  loading: boolean = true;
  layer: LayerWms;
  layerAttributes: LayerAttribute[] = [];
  currentAttributeType: 'string' | 'integer' | 'double' | 'long' | 'date' | null = null;

  showVal: boolean = false;

  constructor(layer: LayerWms) {
    super('querybuilder');
    this.layer = layer;
  }

  render() {
    if (!this.layer.urlWfs) {
      throw new Error('No WFS URL found. Please verify the Layer type.');
    }

    super.render();

    WfsManager.getInstance()
      .getServerWfs(this.layer.urlWfs)
      .then((serverWfs) => {
        this.layerAttributes = serverWfs.layers[this.layer.name];
        this.loading = false;
        super.render();
        super.girafeTranslate();
        this.activateTooltips(false, [800, 0], 'top-end');
      });
  }

  get isString() {
    // TODO REG: Manage the type date as a separate type
    return this.currentAttributeType === 'string' || this.currentAttributeType === 'date';
  }

  get isNumber() {
    return (
      this.currentAttributeType === 'integer' ||
      this.currentAttributeType === 'double' ||
      this.currentAttributeType === 'long'
    );
  }

  attributeChanged() {
    const attributeSelect = this.shadow.getElementById('attribute') as HTMLSelectElement;
    const layerAttribute = this.layerAttributes.find((attr) => (attr.name = attributeSelect.value));
    if (!layerAttribute) {
      throw new Error('Why is this object null ? This should never happen...');
    }

    this.currentAttributeType = layerAttribute.type;
    super.render();
  }

  operatorChanged() {
    const operatorSelect = this.shadow.getElementById('operator') as HTMLSelectElement;
    this.showVal = operatorSelect.value !== 'nul' && operatorSelect.value !== 'nnul';
    super.render();
  }

  filter() {
    const attributeSelect = this.shadow.getElementById('attribute') as HTMLSelectElement;
    const operatorSelect = this.shadow.getElementById('operator') as HTMLSelectElement;
    const val = this.shadow.getElementById('val') as HTMLInputElement;

    this.layer.filter = FilterHelper.getFilter(
      operatorSelect.value,
      attributeSelect.value,
      this.currentAttributeType,
      val.value
    );
    console.log(this.layer.filter);
  }

  removeFilter() {
    const attributeSelect = this.shadow.getElementById('attribute') as HTMLSelectElement;
    const operatorSelect = this.shadow.getElementById('operator') as HTMLSelectElement;
    const val = this.shadow.getElementById('val') as HTMLInputElement;

    this.layer.filter = '';
    attributeSelect.value = '';
    operatorSelect.value = '';
    val.value = '';
    this.currentAttributeType = null;
    this.showVal = false;
    super.render();
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
    });
  }
}

export default QueryBuilderComponent;
