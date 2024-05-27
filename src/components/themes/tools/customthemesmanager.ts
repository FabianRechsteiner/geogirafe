import BaseLayer from '../../../models/layers/baselayer';
import Theme from '../../../models/theme';
import { SharedLayer } from '../../../tools/share/sharedstate';
import StateDeserializer from '../../../tools/share/statedeserializer';
import StateSerializer from '../../../tools/share/stateserializer';
import CustomIcon from '../images/custom.svg';

class CustomThemesManager {
  private counterId: number;
  public customThemes: Theme[] = [];
  private customThemesSerialized: Record<string, SharedLayer[]> = {};
  customIcon: string = CustomIcon;

  constructor(minId: number) {
    this.counterId = minId;
  }

  public addTheme(themeName: string, layersList: BaseLayer[]) {
    const theme = new Theme({
      id: this.counterId++,
      name: themeName,
      icon: this.customIcon
    });

    for (const layerBase of layersList) {
      const layer = layerBase.clone();
      theme._layersTree.push(layer);
    }

    this.customThemes.push(theme);
    this.customThemesSerialized[theme.name] = new StateSerializer().getSerializedLayerTree(theme._layersTree);
    this.saveCustomThemes();
  }

  public deleteTheme(theme: Theme) {
    const index = this.customThemes.findIndex((item) => item === theme);
    if (index >= 0) {
      this.customThemes.splice(index, 1);
      delete this.customThemesSerialized[theme.name];
      this.saveCustomThemes();
    } else {
      throw new Error('The custom theme to be removed cannot be found in the list of custom themes');
    }
  }

  saveCustomThemes() {
    localStorage.setItem('custom-themes', JSON.stringify(this.customThemesSerialized));
  }

  public loadCustomThemes() {
    try {
      const localThemes = localStorage.getItem('custom-themes');
      if (localThemes) {
        this.customThemesSerialized = JSON.parse(localThemes);
        for (const customThemeName in this.customThemesSerialized) {
          const theme = new Theme({
            id: this.counterId++,
            name: customThemeName,
            icon: this.customIcon
          });

          const layerTree = new StateDeserializer().getDeserializedLayerTree(
            this.customThemesSerialized[customThemeName]
          );
          for (const layerBase of layerTree) {
            theme._layersTree.push(layerBase);
          }

          this.customThemes.push(theme);
        }
      }
    } catch (error) {
      console.warn('Cannot deserialize custom themes from local storage');
      console.warn(error);
      // Do not throw the error, the themes selector can still be used
    }
  }
}

export default CustomThemesManager;
