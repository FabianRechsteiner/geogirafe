// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../../base/GirafeHTMLElement';

import checkedIcon from '../../../assets/icons/checked-full.svg?raw';
import checkedNoIcon from '../../../assets/icons/checked-no.svg?raw';
import { UsedInTemplateOnly } from '../../../decorators';

export type FixedDimensionValueChangedEventDetails = {
  id: string;
  dimension: string;
  value: number;
};

export type DimensionUnit = {
  name: string;
  factor: number;
};

const defaultUnits = 'm:1;km:1000';

class FixedDimensionComponent extends GirafeHTMLElement {
  static readonly observedAttributes: string[] = ['dimensionName', 'dimension', 'dimensionUnits', 'onChange'];

  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.css', './style.css'];

  checkedIcon: string = checkedIcon;
  notCheckedIcon: string = checkedNoIcon;

  dimensionName: string = 'dimension';
  dimension: string = 'dimension';
  dimensionUnits: string = defaultUnits;
  onChange: string = '';

  fixedDimensionEnabled: boolean = false;
  renderedOnce = false;
  lastValue: string = '0';
  units: DimensionUnit[] = [];
  unit: DimensionUnit | undefined = undefined;

  public constructor(name = 'fixed-dimension') {
    super(name);
    this.displayStyle = 'grid';
  }

  override render() {
    super.render();
    this.refreshDimensionName();
    this.refreshDimension();
    this.refreshDimensionUnits();
    this.refreshOnChange();
    this.renderComponent();
    super.girafeTranslate();
  }

  private renderComponent() {
    this.show();
    if (!this.renderedOnce) {
      this.renderedOnce = true;
    }
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.render();
  }

  private refreshDimensionName() {
    this.dimensionName = this.getAttribute('dimensionName') ?? 'dimension';
    this.refreshRender();
  }

  private refreshDimension() {
    this.dimension = this.getAttribute('dimension') ?? 'dimension';
  }

  private refreshDimensionUnits(dimensionUnits: string = defaultUnits) {
    console.log(`Refreshing dimension units for ${this.dimension} with units ${dimensionUnits}`);
    this.dimensionUnits = dimensionUnits ?? this.getAttribute('dimensionUnits') ?? defaultUnits;
    this.units = this.dimensionUnits.split(';').map((unit) => {
      const [name, factor] = unit.split(':');
      return { name, factor: Number.parseFloat(factor) } as DimensionUnit;
    });
    this.unit = this.units[0];
    this.refreshRender();
  }

  private refreshOnChange() {
    this.onChange = this.getAttribute('onChange') ?? '';
    console.log(`Refreshing onChange for ${this.dimension} with onChange ${this.onChange}`);
  }

  toggleFixedDimensionEnabled() {
    this.fixedDimensionEnabled = !this.fixedDimensionEnabled;
    this.dispatchFixedDimensionValueChangedEvent(this.fixedDimensionEnabled ? this.lastValue : '0');
    this.refreshRender();
  }

  fixedValueChanged(e: InputEvent) {
    this.lastValue = (e.target as HTMLInputElement).value;
    this.dispatchFixedDimensionValueChangedEvent(this.lastValue);
    this.htmlUnsafe(this.onChange);
  }

  dimensionUnitChanged(e: Event) {
    const selectedUnitFactor = Number.parseFloat((e.target as HTMLSelectElement).value);
    this.unit = this.units.find((unit) => unit.factor == selectedUnitFactor);
    this.dispatchFixedDimensionValueChangedEvent(this.lastValue);
  }

  dispatchFixedDimensionValueChangedEvent(valueAsString: string) {
    const value = Number.parseFloat(valueAsString);
    this.dispatchEvent(
      new CustomEvent('fixed-dimension:value-changed', {
        bubbles: true,
        cancelable: true,
        detail: {
          id: this.id,
          dimension: this.dimension,
          value: value * (this.unit?.factor ?? 1)
        } as FixedDimensionValueChangedEventDetails
      })
    );
  }

  @UsedInTemplateOnly(
    'attributeChangedCallback is not used in this component, but it is required by the HTMLElement interface.'
  )
  protected attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === 'dimensionName') {
      this.dimensionName = newValue;
    } else if (name === 'dimension') {
      this.dimension = newValue;
    } else if (name === 'dimensionUnits') {
      this.refreshDimensionUnits(newValue);
    } else if (name === 'onChange') {
      this.onChange = newValue;
    }
  }
}

export default FixedDimensionComponent;
