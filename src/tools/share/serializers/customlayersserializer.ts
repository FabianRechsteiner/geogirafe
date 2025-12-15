import CustomTheme from '../../../models/customtheme';
import BaseLayer from '../../../models/layers/baselayer';
import ThemeLayer from '../../../models/layers/themelayer';
import LayersConfigSerializer from './layerconfigserializer';
import { SharedLayer } from './sharedtypes';

export default class CustomLayersSerializer extends LayersConfigSerializer {
  public customThemeSerialize(customTheme: CustomTheme): string {
    return this.serialize(customTheme.layers);
  }

  public customThemeDeserialize(name: string, str: string): CustomTheme {
    const customTheme = new CustomTheme(name);
    customTheme.layers = this.deserialize(str) as ThemeLayer[];
    return customTheme;
  }

  protected override getSerializedLayer(layer: BaseLayer): SharedLayer {
    const serializedLayer = super.getSerializedLayer(layer);
    serializedLayer.checked = Number(layer.isDefaultChecked);
    return serializedLayer;
  }
}
