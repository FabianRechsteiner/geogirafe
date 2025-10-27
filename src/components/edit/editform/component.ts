import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import Feature from 'ol/Feature';
import OgcApiFeaturesSchema from '../../../tools/ogcapi/ogcapifeaturesschema';

export default class EditFromComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.css', './style.css'];

  public featureSchema?: OgcApiFeaturesSchema;
  public feature?: Feature;

  constructor() {
    super('editform');
  }

  public setSchema(schema: OgcApiFeaturesSchema) {
    this.featureSchema = schema;
    this.refreshRender();
  }

  public setFeature(feature: Feature | undefined) {
    this.feature = feature;
    if (!this.feature) {
      this.resetForm();
    }
    this.refreshRender();
  }

  public getInputType(attributeName: string) {
    if (this.featureSchema?.isNumericProperty(attributeName)) {
      return 'number';
    }
    if (this.featureSchema?.isTextProperty(attributeName) || this.featureSchema?.isTemporalProperty(attributeName)) {
      return 'text';
    }
    return 'text';
  }

  public getCurrentValue(attrName: string) {
    return this.feature?.getProperties()[attrName] ?? '';
  }

  public valid(): boolean {
    return true;
  }

  public getFormValues() {
    if (!this.feature || !this.featureSchema) {
      return {};
    }
    const properties = this.featureSchema.template;
    // Set attribute values
    for (const [attrName, _attrProps] of this.featureSchema.formAttributes) {
      const formField = this.getById(`form-${attrName}`);
      let formValue: number | string | null = (formField as HTMLInputElement).value;
      if (this.featureSchema.isNumericProperty(attrName)) {
        if (formValue === '' || isNaN(Number(formValue))) {
          formValue = null;
        } else {
          formValue = Number(formValue);
        }
      }
      properties[attrName] = formValue;
    }
    return properties;
  }

  private resetForm() {
    if (this.feature && this.featureSchema) {
      for (const [attrName, _] of this.featureSchema.formAttributes) {
        const formField = this.getById(`form-${attrName}`);
        (formField as HTMLInputElement).value = '';
      }
    }
  }

  connectedCallback() {
    super.connectedCallback();
    super.render();
  }
}
