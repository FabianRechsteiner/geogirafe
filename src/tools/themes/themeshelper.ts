import GirafeSingleton from '../../base/GirafeSingleton';
import CustomTheme from '../../models/customtheme';
import BaseLayer from '../../models/layers/baselayer';
import GroupLayer from '../../models/layers/grouplayer';
import Layer from '../../models/layers/layer';
import ThemeLayer from '../../models/layers/themelayer';
import ConfigManager from '../configuration/configmanager';
import StateManager from '../state/statemanager';

export default class ThemesHelper extends GirafeSingleton {
  configManager: ConfigManager;
  stateManager: StateManager;

  constructor(type: string) {
    super(type);

    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();

    this.stateManager.subscribe(
      'themes.lastSelectedTheme',
      (_oldTheme: ThemeLayer | CustomTheme | null, newTheme: ThemeLayer | CustomTheme | null) =>
        this.onSelectedThemeChanged(newTheme)
    );
  }

  get state() {
    return this.stateManager.state;
  }

  public findBaseLayerById(layerId: number): BaseLayer {
    for (const theme of Object.values(this.state.themes._allThemes)) {
      if (theme.id === layerId) {
        return theme;
      }

      const child = this.findBaseLayerRecurviveById(theme.children, layerId);
      if (child) {
        return child;
      }
    }

    throw new Error(`No BaseLayer with ID ${layerId} could be found.`);
  }

  private findBaseLayerRecurviveById(layers: BaseLayer[], layerId: number): BaseLayer | null {
    for (const layer of layers) {
      if (layer.id === layerId) {
        return layer;
      }
      if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
        const child = this.findBaseLayerRecurviveById(layer.children, layerId);
        if (child) {
          return child;
        }
      }
    }

    return null;
  }

  public findThemeByName(themename: string): ThemeLayer {
    for (const theme of Object.values(this.state.themes._allThemes)) {
      if (theme.name === themename) {
        return theme;
      }
    }

    throw new Error(`Theme ${themename} was not found`);
  }

  public findGroupByName(groupname: string): GroupLayer {
    const group = this.findBaseLayerByName(groupname);
    if (group instanceof GroupLayer) {
      return group;
    }

    throw new Error(`Layer ${group.name} was found, but is not a group`);
  }

  public findLayerByName(layername: string): Layer {
    const layer = this.findBaseLayerByName(layername);
    if (layer instanceof Layer) {
      return layer;
    }

    throw new Error(`Layer ${layer.name} was found, but is not a layer`);
  }

  private findBaseLayerByName(layername: string): BaseLayer {
    for (const theme of Object.values(this.state.themes._allThemes)) {
      const layer = this.findLayerRecursive(theme.children, layername);
      if (layer) {
        return layer;
      }
    }
    throw new Error(`Layer ${layername} not found !`);
  }

  private findLayerRecursive(layers: BaseLayer[], layername: string): BaseLayer | null {
    for (const layer of layers) {
      if (layer.name === layername) {
        return layer;
      }
      if (layer instanceof GroupLayer) {
        const child = this.findLayerRecursive(layer.children, layername);
        if (child) {
          return child;
        }
      }
    }

    return null;
  }

  onSelectedThemeChanged(theme: ThemeLayer | CustomTheme | null) {
    if (!theme) {
      // Theme is null, nothing to do here
      return;
    }

    if (theme instanceof CustomTheme) {
      theme.layers.sort((a, b) => a.order - b.order);
      for (const t of theme.layers) {
        this.onThemeChanged(t);
      }
    } else {
      this.onThemeChanged(theme);
    }
  }

  private onThemeChanged(theme: ThemeLayer) {
    // Create a clone of the theme object to use it in the treeview.
    // This is essential, otherwise all changes done in the layers
    // (For example when expanding legend, expanding a group, or activating the layer)
    // Will also be done in the default layer configuration that has been loaded from themes.json
    // And when a theme will be selected aging from the themes-selector
    // The default configuration will have been overwritten.
    const clonedTheme = theme.clone();

    if (this.configManager.Config.themes.selectionMode === 'replace') {
      // Mode is <replace>
      // => Deactivate all active layers
      for (const element of this.state.layers.layersList) {
        element.activeState = 'off';
      }
      // Add new selected theme: Delay this step to give tree view time to render the previous step
      setTimeout(() => {
        this.state.layers.layersList = [clonedTheme];
      });
    } else if (!this.state.layers.layersList.find((l) => l.id == clonedTheme.id)) {
      // Mode is <add>
      // Add new theme to the list if is not in the list yet
      // Set order to 0, because the theme should be added at the top of the list
      clonedTheme.order = 0;
      this.state.layers.layersList.push(clonedTheme);
    } else {
      console.info(`The theme ${clonedTheme.name} is already present in the treeview.`);
    }
  }
}
