import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import BaseLayer from '../../models/layers/baselayer';
import GroupLayer from '../../models/layers/grouplayer';
import ThemeLayer from '../../models/layers/themelayer';
import LayerManager from '../../tools/layermanager';
import ThemesManager from '../../tools/themesmanager';

class TreeViewThemeComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  layerManager: LayerManager;

  theme: ThemeLayer;

  constructor(theme: ThemeLayer) {
    super('treeviewtheme');

    this.layerManager = LayerManager.getInstance();
    this.theme = theme;
  }

  render() {
    // If we come from an  html element, the layer was not defined in the constructor
    // And we have to set the layer using the id passed to the layerid attribute
    const themeId = this.getAttribute('themeid');
    if (themeId) {
      this.theme = this.layerManager.getTreeItem(themeId) as ThemeLayer;
    }
    super.render();
    this.activateTooltips(false, [800, 0], 'right');
  }

  registerEvents() {
    this.stateManager.subscribe(
      /layers\.layersList\..*\.isExpanded/,
      (_oldValue: boolean, _newValue: boolean, theme: ThemeLayer) => this.refreshRender(theme)
    );
    this.stateManager.subscribe(
      /layers\.layersList\..*\.activeState/,
      (_oldValue: boolean, _newValue: boolean, theme: ThemeLayer) => this.refreshRender(theme)
    );
    this.stateManager.subscribe(
      /layers\.layersList\..*\.children/,
      (oldChildren: BaseLayer[], newChildren: BaseLayer[], theme: ThemeLayer) =>
        this.onChildrenListChanged(oldChildren, newChildren, theme)
    );
  }

  refreshRender(theme: ThemeLayer) {
    if (theme === this.theme) {
      super.render();
    }
  }

  onChildrenListChanged(oldChildren: BaseLayer[], newChildren: BaseLayer[], theme: ThemeLayer) {
    this.refreshRender(theme);
    // If we added a new group to the list of layers
    // Then we activate the layers that should be activated by default
    const addedLayers = newChildren.filter(
      (newChild) => !oldChildren.find((oldChild) => oldChild.treeItemId === newChild.treeItemId)
    );
    this.activateDefaultLayers(addedLayers);
  }

  activateDefaultLayers(layers: BaseLayer[]) {
    for (const layer of layers) {
      this.layerManager.activateIfDefaultChecked(layer);
      if (layer instanceof GroupLayer) {
        this.activateDefaultLayers(layer.children);
      }
    }
  }

  toggle(state?: 'on' | 'off' | 'semi') {
    this.layerManager.toggleGroupOrTheme(this.theme, state);
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }

  deactivateThemeOrGroup(layer: BaseLayer) {
    layer.activeState = 'off';
    if (layer instanceof ThemeLayer || layer instanceof GroupLayer) {
      for (const child of layer.children) {
        this.deactivateThemeOrGroup(child);
      }
    }
  }

  deleteTheme() {
    this.deactivateThemeOrGroup(this.theme);
    this.state.layers.layersList = ThemesManager.getInstance().getNewLayersListForRemove(this.theme);
    this.state.themes.lastSelectedTheme = null;
  }
}

export default TreeViewThemeComponent;
