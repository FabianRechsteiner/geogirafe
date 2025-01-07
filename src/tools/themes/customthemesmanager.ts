import GirafeSingleton from '../../base/GirafeSingleton';
import UserDataManager from '../userdata/userdatamanager';
import BaseLayer from '../../models/layers/baselayer';
import GroupLayer from '../../models/layers/grouplayer';
import Layer from '../../models/layers/layer';
import ThemeLayer from '../../models/layers/themelayer';
import { SharedLayer } from '../share/sharedstate';
import StateDeserializer from '../share/statedeserializer';
import CustomTheme from '../../models/customtheme';

class CustomThemesManager extends GirafeSingleton {
  userDataManager: UserDataManager;
  customThemes: CustomTheme[] = [];
  private readonly storagePath: string = 'customThemes';

  constructor(type: string) {
    super(type);
    this.userDataManager = UserDataManager.getInstance();
  }

  public addTheme(themeName: string, layersList: BaseLayer[]) {
    const theme = new CustomTheme(themeName);
    for (const layerBase of layersList) {
      const layer = layerBase.clone();
      this.manageActiveStateForClonedObject(layer);
      theme.layers.push(layer);
    }

    this.customThemes.push(theme);
    this.saveCustomThemes();
  }

  manageActiveStateForClonedObject(layer: BaseLayer) {
    /** Manage the current active state and default active state
     * 1. We set isDefaultChecked to the active state (because when the layer will be loaded, we want to activate it automatically)
     * 2. We deactivate the layer, because it was just cloned and is not active yet.
     * We only do this on layers, not on groups
     **/
    if (layer instanceof Layer) {
      layer.isDefaultChecked = layer.active;
      layer.activeState = 'off';
    } else if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
      for (const child of layer.children) {
        this.manageActiveStateForClonedObject(child);
      }
    }
  }

  public deleteTheme(theme: CustomTheme) {
    const index = this.customThemes.findIndex((item) => item === theme);
    if (index >= 0) {
      this.customThemes.splice(index, 1);
      this.saveCustomThemes();
    } else {
      throw new Error('The custom theme to be removed cannot be found in the list of custom themes');
    }
  }

  private saveCustomThemes() {
    const serializedObject: Record<string, SharedLayer[]> = {};
    for (const customTheme of this.customThemes) {
      serializedObject[customTheme.name] = customTheme.getSerialized();
    }
    this.userDataManager.saveUserData(this.storagePath, serializedObject);
  }

  public loadCustomThemes() {
    const customThemes = this.userDataManager.getUserData(this.storagePath) as Record<string, SharedLayer[]>;
    if (customThemes) {
      for (const customThemeName of Object.keys(customThemes)) {
        try {
          const customTheme = new CustomTheme(customThemeName);
          const serializedLayerTree = customThemes[customThemeName];
          const layerTree = new StateDeserializer().getDeserializedLayerTree(serializedLayerTree);
          customTheme.layers.push(...layerTree);
          this.customThemes.push(customTheme);
        } catch (error) {
          console.warn('Cannot deserialize custom themes from local storage');
          console.warn(error);
          // Do not throw the error, the themes selector can still be used
        }
      }
    }
  }
}

export default CustomThemesManager;
