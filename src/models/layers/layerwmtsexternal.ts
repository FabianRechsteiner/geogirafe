// SPDX-License-Identifier: Apache-2.0
import LayerWmts from './layerwmts';

export default class LayerWmtsExternal extends LayerWmts {
  private static nextAvailableLayerId = 20000000;

  private selected: boolean = false;

  public get isSelected() {
    return this.selected;
  }

  public set isSelected(value) {
    this.selected = value;
    this.isDefaultChecked = value;
  }

  public constructor(name: string, url: string, layer: string) {
    const id = LayerWmtsExternal.nextAvailableLayerId++;
    super(id, name, 0, url, layer);
  }

  public override clone(): LayerWmtsExternal {
    const clonedLayer = new LayerWmtsExternal(this.name, this.url, this.layer);
    clonedLayer.isSelected = this.isSelected;
    return clonedLayer;
  }
}
