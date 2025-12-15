import ThemeLayer from './layers/themelayer';
import CustomIcon from '../components/themes/images/custom.svg';

export default class CustomTheme {
  public id: number;
  public layers: ThemeLayer[];
  public name: string;
  public icon: string;

  public get hasThemes() {
    for (const layer of this.layers) {
      if (layer instanceof ThemeLayer) {
        return true;
      }
    }
    return false;
  }

  public constructor(name: string) {
    this.id = Date.now();
    this.name = name;
    this.layers = [];
    this.icon = CustomIcon;
  }
}
