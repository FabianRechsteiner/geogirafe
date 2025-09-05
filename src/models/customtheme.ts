import ThemeLayer from './layers/themelayer';
import CustomIcon from '../components/themes/images/custom.svg';

export default class CustomTheme {
  id: number;
  layers: ThemeLayer[];
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
    this.id = Date.now();
    this.name = name;
    this.layers = [];
    this.icon = CustomIcon;
  }
}
