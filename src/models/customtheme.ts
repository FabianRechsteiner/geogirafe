import BaseLayer from './layers/baselayer';
import ThemeLayer from './layers/themelayer';
import { SharedLayer } from '../tools/share/sharedstate';
import StateSerializer from '../tools/share/stateserializer';
import CustomIcon from '../components/themes/images/custom.svg';
import { v4 as uuidv4 } from 'uuid';

export default class CustomTheme {
  id: string;
  layers: BaseLayer[];
  name: string;
  icon: string;

  get hasThemes() {
    for (const layer of this.layers) {
      if (layer instanceof ThemeLayer) {
        return true;
      }
    }
    return false;
  }

  constructor(name: string) {
    this.id = uuidv4();
    this.name = name;
    this.layers = [];
    this.icon = CustomIcon;
  }

  getSerialized(): SharedLayer[] {
    return new StateSerializer().getSerializedLayerTree(this.layers);
  }

  getThemeLayer() {
    const theme = new ThemeLayer(1000000, this.name, 0);
    theme.children.push(...this.layers);
    return theme;
  }
}
