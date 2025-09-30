import GirafeSingleton from '../../base/GirafeSingleton';
import StateManager from '../state/statemanager';
import ThemeLayer from '../../models/layers/themelayer';
import Layer from '../../models/layers/layer';
import LayerManager from '../layers/layermanager';
import LayerDrawing from '../../models/layers/layerdrawing';
import LayerLocalFile from '../../models/layers/layerlocalfile';

/**
 * Manages layers that hold user-derived data such as drawings or local files. Each type of user data layer is
 * grouped under a theme layer in the layer tree.
 * This manager provides functionality for adding, organizing, and toggling visibility of user data layers
 * in the layer tree.
 */
export default class UserLayerManager extends GirafeSingleton {
  stateManager: StateManager;
  layerManager: LayerManager;
  themeLayers: Record<string, ThemeLayer> = {};

  get state() {
    return this.stateManager.state;
  }

  constructor(type: string) {
    super(type);

    this.stateManager = StateManager.getInstance();
    this.layerManager = LayerManager.getInstance();
  }

  private getThemeLayerInTree(userTheme: ThemeLayer): ThemeLayer | null {
    try {
      return this.stateManager.state.layers.layersList.find((l) => l.treeItemId === userTheme.treeItemId) as ThemeLayer;
    } catch {
      return null;
    }
  }

  private getUserLayerInTree(userLayer: Layer): Layer | null {
    try {
      return LayerManager.getInstance().getTreeItem(userLayer.treeItemId) as Layer;
    } catch {
      return null;
    }
  }

  private getOrCreateThemeLayer(themeName: string): ThemeLayer {
    let themeLayer = this.themeLayers[themeName];
    if (!themeLayer) {
      themeLayer = new ThemeLayer(0, themeName, 0, '', { isDefaultChecked: true, isDefaultExpanded: true });
      this.themeLayers[themeName] = themeLayer;
    }
    return themeLayer;
  }

  private getThemeNameByLayerType(layer: Layer) {
    let themeName = '';
    if (layer instanceof LayerDrawing) {
      themeName = 'Drawings';
    } else if (layer instanceof LayerLocalFile) {
      themeName = 'Local Files';
    }
    return themeName;
  }

  addUserLayerToTree(layer: Layer) {
    const themeName = this.getThemeNameByLayerType(layer);

    const theme = this.getOrCreateThemeLayer(themeName);
    if (!this.getUserLayerInTree(layer)) {
      // TODO: Fix this type error
      // @ts-expect-error Layer is added to the theme without a group in-between
      layer.parent = theme;
      theme.children.push(layer);
      if (!this.getThemeLayerInTree(theme)) {
        theme.order = 0;
        this.stateManager.state.layers.layersList.push(theme);
      }
    }
  }

  removeUserLayerFromTree(layer: Layer) {
    const themeName = this.getThemeNameByLayerType(layer);

    const theme = this.themeLayers[themeName];
    const userLayer = this.getUserLayerInTree(layer);
    if (theme && userLayer) {
      // Remove the user layer from the map
      userLayer.activeState = 'off';
      // Remove the user layer from the tree theme
      const index = theme.children.findIndex((l) => l.treeItemId === userLayer.treeItemId);
      if (index >= 0) {
        theme.children.splice(index, 1);
        if (theme.children.length === 0) {
          // Remove the theme layer from the tree
          const index = this.state.layers.layersList.findIndex((l) => l.treeItemId === theme.treeItemId);
          if (index >= 0) {
            this.state.layers.layersList.splice(index, 1);
            delete this.themeLayers[themeName];
          }
        }
      }
    }
  }
}
