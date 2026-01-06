import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import LayerWms from '../../models/layers/layerwms';
import { LayerAttribute } from '../../models/serverwfs';
import WfsFilter, { mapAttributeTypeToFilterOperators, WfsOperator } from '../../tools/wfs/wfsfilter';
import { isString, isNumber, isDate } from '../../models/xmlTypes';
import IGirafeContext from '../../tools/context/icontext';
import ColumnAliasHelper from '../../tools/utils/aliases';

class QueryBuilderComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  loading: boolean = true;
  deactivated: boolean = false;
  layer: LayerWms;
  layerAttributes: LayerAttribute[] = [];
  layerAttributesTranslations: Record<string, string> = {};
  currentLayerAttribute?: LayerAttribute = undefined;
  columnAliasHelper!: ColumnAliasHelper;

  showVal: boolean = false;
  showVal2: boolean = false;
  allOperatorOptions: { operator: WfsOperator; displayName: string }[] = [
    { operator: 'eq', displayName: 'equals' },
    { operator: 'neq', displayName: 'does not equal' },
    { operator: 'like', displayName: 'contains' },
    { operator: 'nlike', displayName: 'does not contain' },
    { operator: 'gt', displayName: 'greater than' },
    { operator: 'gte', displayName: 'greater than or equal to' },
    { operator: 'lt', displayName: 'less than' },
    { operator: 'lte', displayName: 'less than or equal to' },
    { operator: 'before', displayName: 'before' },
    { operator: 'after', displayName: 'after' },
    { operator: 'between', displayName: 'between' },
    { operator: 'nul', displayName: 'is blank' },
    { operator: 'nnul', displayName: 'is not blank' }
  ];
  operatorOptions: { operator: WfsOperator; displayName: string }[] = [];

  public constructor(layer: LayerWms, context: IGirafeContext) {
    super('querybuilder', context);
    this.layer = layer;
  }

  render() {
    if (!this.layer.ogcServer.urlWfs) {
      throw new Error('No WFS URL found. Please verify the Layer type.');
    }

    super.render();

    const stackedLayerAttributes: LayerAttribute[][] = [];
    this.context.wfsManager.getServerWfs(this.layer).then((serverWfs) => {
      const queryLayers = this.layer.queryLayers!.split(',');

      for (const queryLayer of queryLayers) {
        const attributes = serverWfs.layers[queryLayer];
        stackedLayerAttributes.push(attributes);
        for (const attribute of attributes) {
          const translation = this.context.i18nManager.getTranslation(
            this.columnAliasHelper.getColumnAlias(queryLayer, attribute.name)
          );
          this.layerAttributesTranslations[attribute.name] = translation;
        }
      }

      const layerAttributesCount: Record<string, number> = {};
      for (const la of stackedLayerAttributes.flat()) {
        layerAttributesCount[la.name] ??= 0;
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

      super.refreshRender();
      this.initializeFilterFromLayer();
    });
  }

  get inputTypeForFilterValue(): string {
    if (isDate(this.currentLayerAttribute?.type || '')) {
      if (this.currentLayerAttribute?.type === 'datetime') {
        return 'datetime-local';
      }
      return 'date';
    }
    return 'string';
  }

  private initializeFilterFromLayer() {
    if (this.layer.filter) {
      const [attributeSelect, operatorSelect, val, val2] = this.getFilterElements();
      attributeSelect.value = this.layer.filter.property;
      this.attributeChanged();
      operatorSelect.value = this.layer.filter.operator;
      this.operatorChanged();

      val.value = this.layer.filter.value;
      val2.value = this.layer.filter.value2;
    }
  }

  updateOperatorOptions() {
    this.operatorOptions = [];

    let xmlTypeGroup: 'string' | 'number' | 'date';
    if (isString(this.currentLayerAttribute?.type || '')) {
      xmlTypeGroup = 'string';
    } else if (isNumber(this.currentLayerAttribute?.type || '')) {
      xmlTypeGroup = 'number';
    } else if (isDate(this.currentLayerAttribute?.type || '')) {
      xmlTypeGroup = 'date';
    }
    this.operatorOptions = this.allOperatorOptions.filter((option) =>
      xmlTypeGroup ? mapAttributeTypeToFilterOperators[xmlTypeGroup].includes(option.operator) : false
    );

    const operatorSelect = this.shadow.getElementById('operator') as HTMLSelectElement;
    const currentOperator: WfsOperator = <WfsOperator>operatorSelect?.value;

    if (!this.operatorOptions.map((op) => op.operator).includes(currentOperator)) {
      operatorSelect.value = '';
      this.operatorChanged();
    }
  }

  attributeChanged() {
    const attributeSelect = this.shadow.getElementById('attribute') as HTMLSelectElement;
    const layerAttribute = this.layerAttributes.find((attr) => attr.name == attributeSelect.value);
    if (!layerAttribute) {
      throw new Error('Why is this object null ? This should never happen...');
    }

    this.currentLayerAttribute = layerAttribute;
    this.updateOperatorOptions();
    super.refreshRender();
  }

  operatorChanged() {
    const operatorSelect = this.shadow.getElementById('operator') as HTMLSelectElement;
    this.showVal = !!operatorSelect?.value && operatorSelect?.value !== 'nul' && operatorSelect?.value !== 'nnul';
    this.showVal2 = operatorSelect?.value === 'between';
    super.refreshRender();
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
    const value2Input = this.shadow.getElementById('val2') as HTMLInputElement;
    return [attributeSelect, operatorSelect, valueInput, value2Input];
  }

  validateInput(val: string): string {
    if (val && isDate(this.currentLayerAttribute?.type || '')) {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date value entered !');
      }
    }
    return val;
  }

  getFilter() {
    const [attributeSelect, operatorSelect, val, val2] = this.getFilterElements();

    const property = attributeSelect.value;
    const operator = operatorSelect.value as WfsOperator;
    const value = this.validateInput(val.value);
    const value2 = this.validateInput(val2.value);
    if (this.showVal2 && (!value || !value2)) {
      return;
    }
    return new WfsFilter(property, operator, value, value2, this.currentLayerAttribute?.type);
  }

  filter() {
    this.layer.filter = this.getFilter();
  }

  removeFilter() {
    const [attributeSelect, operatorSelect, val, val2] = this.getFilterElements();

    this.layer.filter = undefined;
    attributeSelect.value = '';
    operatorSelect.value = '';
    val.value = '';
    val2.value = '';
    this.currentLayerAttribute = undefined;
    this.showVal = false;
    this.showVal2 = false;
    super.refreshRender();
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.columnAliasHelper = new ColumnAliasHelper(this.context.stateManager);
    this.render();
  }
}

export default QueryBuilderComponent;
