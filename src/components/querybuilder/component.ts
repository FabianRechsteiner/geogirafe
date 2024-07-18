import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import LayerWms from '../../models/layers/layerwms';
import WfsManager from '../../tools/wfs/wfsmanager';
import { LayerAttribute } from '../../models/serverwfs';
import { WfsFilter, WfsOperator } from '../../tools/wfs/wfsfilter';
import { xmlNumberTypesStrList, xmlStringTypesStrList } from '../../models/xmlTypes';

class QueryBuilderComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  loading: boolean = true;
  deactivated: boolean = false;
  layer: LayerWms;
  layerAttributes: LayerAttribute[] = [];
  currentLayerAttribute?: LayerAttribute = undefined;

  showVal: boolean = false;

  constructor(layer: LayerWms) {
    super('querybuilder');
    this.layer = layer;
  }

  render() {
    if (!this.layer.ogcServer.urlWfs) {
      throw new Error('No WFS URL found. Please verify the Layer type.');
    }

    super.render();

    WfsManager.getServerWfs(this.layer).then((serverWfs) => {
      const queryLayers = this.layer.queryLayers!.split(',');

      const stackedLayerAttributes = queryLayers.map((l: string) => serverWfs.layers[l]);
      const layerAttributesCount: Record<string, number> = {};
      for (const la of stackedLayerAttributes.flat()) {
        if (layerAttributesCount[la.name] === undefined) {
          layerAttributesCount[la.name] = 0;
        }
        layerAttributesCount[la.name]++;
      }
      const commonAttributesNames = Object.keys(layerAttributesCount).filter(
        (k) => layerAttributesCount[k] === queryLayers.length
      );
      const commonAttributes = stackedLayerAttributes[0]
        ? stackedLayerAttributes[0].filter((la) => commonAttributesNames.includes(la.name))
        : [];

      this.deactivated = commonAttributes.length === 0;
      if (this.deactivated) {
        console.log(
          'Filtering for layer group ' +
            this.layer.name +
            " is deactivated because the queryLayers don't have common attributes."
        );
      }
      this.layerAttributes = commonAttributes;
      this.loading = false;
      super.render();
      super.girafeTranslate();
      this.activateTooltips(false, [800, 0], 'top-end');
    });
  }

  get isString() {
    // TODO REG: Manage the type date as a separate type
    return xmlStringTypesStrList.includes(this.currentLayerAttribute?.type ?? '');
  }

  get isNumber() {
    return xmlNumberTypesStrList.includes(this.currentLayerAttribute?.type ?? '');
  }

  attributeChanged() {
    const attributeSelect = this.shadow.getElementById('attribute') as HTMLSelectElement;
    const layerAttribute = this.layerAttributes.find((attr) => attr.name == attributeSelect.value);
    if (!layerAttribute) {
      throw new Error('Why is this object null ? This should never happen...');
    }

    this.currentLayerAttribute = layerAttribute;
    super.render();
  }

  operatorChanged() {
    const operatorSelect = this.shadow.getElementById('operator') as HTMLSelectElement;
    this.showVal = operatorSelect.value !== 'nul' && operatorSelect.value !== 'nnul';
    super.render();
  }

  onValueKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.filter();
    }
  }

  getFilterElements() {
    const attributeSelect = this.shadow.getElementById('attribute') as HTMLSelectElement;
    const operatorSelect = this.shadow.getElementById('operator') as HTMLSelectElement;
    const valueInput = this.shadow.getElementById('val') as HTMLInputElement;
    return [attributeSelect, operatorSelect, valueInput];
  }

  getFilter() {
    const [attributeSelect, operatorSelect, val] = this.getFilterElements();

    const property = attributeSelect.value;
    const operator = operatorSelect.value as WfsOperator;
    const value = val.value;
    const filter = new WfsFilter(property, operator, value, this.currentLayerAttribute?.type);
    return filter;
  }

  filter() {
    this.layer.filter = this.getFilter();
  }

  removeFilter() {
    const [attributeSelect, operatorSelect, val] = this.getFilterElements();

    this.layer.filter = undefined;
    attributeSelect.value = '';
    operatorSelect.value = '';
    val.value = '';
    this.currentLayerAttribute = undefined;
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
