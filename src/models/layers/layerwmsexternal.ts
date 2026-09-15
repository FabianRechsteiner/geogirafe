// SPDX-License-Identifier: Apache-2.0
import ServerOgc from '../serverogc';
import LayerWms, { LayerWmsOptions } from './layerwms';

export default class LayerWmsExternal extends LayerWms {
  private static nextAvailableLayerId = 10000000;

  private selected: boolean = false;

  public get isSelected() {
    return this.selected;
  }

  public set isSelected(value) {
    this.selected = value;
    this.isDefaultChecked = value;
  }

  public constructor(title: string, name: string, ogcServer: ServerOgc) {
    const id = LayerWmsExternal.nextAvailableLayerId++;
    const options: LayerWmsOptions = {
      layers: name,
      queryable: true,
      legend: true,
      isLegendExpanded: false
    };

    super(id, title, 0, ogcServer, options);
  }

  public override clone(): LayerWmsExternal {
    const clonedLayer = new LayerWmsExternal(this.name, this.layers!, this.ogcServer);
    clonedLayer.isSelected = this.isSelected;
    return clonedLayer;
  }
}
