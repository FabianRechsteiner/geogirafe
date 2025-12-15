import GirafeSingleton from '../../base/GirafeSingleton';
import ThemeLayer from '../../models/layers/themelayer';
import Layer from '../../models/layers/layer';
import LayerDrawing from '../../models/layers/layerdrawing';
import LayerLocalFile from '../../models/layers/layerlocalfile';

type UserThemeConfig = {
  name: string;
  isRemovable: boolean;
  isPinned: boolean;
};

/**
 * Manages layers that hold user-derived data such as drawings or local files. Each type of user data layer is
 * grouped under a theme layer in the layer tree.
 * This manager provides functionality for adding, organizing, and toggling visibility of user data layers
 * in the layer tree.
 */
export default class UserLayerManager extends GirafeSingleton {
  private themeLayerItemIds: Record<string, string> = {};

  private readonly userThemeConfig: Record<string, UserThemeConfig> = {
    drawing: {
      name: 'Drawings',
      isRemovable: false,
      isPinned: true
    },
    localFile: {
      name: 'Local Files',
      isRemovable: true,
      isPinned: true
    },
    default: {
      name: 'User data',
      isRemovable: true,
      isPinned: true
    }
  };

  private get state() {
    return this.context.stateManager.state;
  }

  private getThemeLayerByTreeId(treeItemId: string): ThemeLayer | null {
    try {
      return this.context.stateManager.state.layers.layersList.find((l) => l.treeItemId === treeItemId) as ThemeLayer;
    } catch {
      return null;
    }
  }

  private getUserLayerByTreeId(treeItemId: string): Layer | null {
    for (const theme of this.state.layers.layersList) {
      if (theme instanceof ThemeLayer) {
        for (const layer of theme.children) {
          if (layer.treeItemId === treeItemId) {
            return layer as Layer;
          }
        }
      }
    }
    return null;
  }

  private getOrCreateThemeLayer(config: UserThemeConfig): ThemeLayer {
    let themeLayer = this.getThemeLayerByTreeId(this.themeLayerItemIds[config.name]);
    if (!themeLayer) {
      themeLayer = new ThemeLayer(0, config.name, 0, '', { isDefaultChecked: true, isDefaultExpanded: true });
      themeLayer.order = this.context.themesHelper.getInitialOrderForNewTheme();
      themeLayer.isPinned = config.isPinned;
      themeLayer.isRemovable = config.isRemovable;
    }
    return themeLayer;
  }

  private getThemeConfig(layer: Layer): UserThemeConfig {
    if (layer instanceof LayerDrawing) {
      return this.userThemeConfig.drawing;
    } else if (layer instanceof LayerLocalFile) {
      return this.userThemeConfig.localFile;
    }
    return this.userThemeConfig.default;
  }

  /**
   * Adds a user data layer to the layer tree. Each layer is added to the corresponding theme.
   * If the theme layer does not exist yet, it is created according to a set of pre-defined configuration values.
   */
  public addUserLayerToTree(layer: Layer) {
    const config = this.getThemeConfig(layer);

    const theme = this.getOrCreateThemeLayer(config);
    const userLayerInTree = this.getUserLayerByTreeId(layer.treeItemId);
    if (userLayerInTree) {
      this.context.layerManager.toggleLayer(userLayerInTree, 'on');
    } else {
      layer.parent = theme;
      theme.children.push(layer);
      if (!this.getThemeLayerByTreeId(theme.treeItemId)) {
        this.context.stateManager.state.layers.layersList.push(theme);
        this.themeLayerItemIds[config.name] = theme.treeItemId;
      }
    }
  }

  /**
   * Removes a user data layer from the layer tree.
   * If the associated theme layer becomes empty after the user layer is removed, the theme layer is also removed.
   */
  public removeUserLayerFromTree(layer: Layer) {
    const config = this.getThemeConfig(layer);
    const theme = this.getThemeLayerByTreeId(this.themeLayerItemIds[config.name]);
    const userLayer = this.getUserLayerByTreeId(layer.treeItemId);

    if (userLayer) {
      this.context.themesHelper.removeLayersFromLayerTree([userLayer]);
      if (theme?.children.length === 0) {
        // Remove the theme layer if it's empty
        this.context.themesHelper.removeLayersFromLayerTree([theme]);
        delete this.themeLayerItemIds[config.name];
      }
    }
  }
}
