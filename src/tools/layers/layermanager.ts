import GirafeSingleton from '../../base/GirafeSingleton';
import BaseLayer from '../../models/layers/baselayer';
import GroupLayer from '../../models/layers/grouplayer';
import Layer from '../../models/layers/layer';
import ConfigManager from '../configuration/configmanager';
import StateManager from '../state/statemanager';
import ILayerWithLegend from '../../models/layers/ilayerwithlegend';
import ILayerWithFilter from '../../models/layers/ilayerwithfilter';
import ThemeLayer from '../../models/layers/themelayer';

class LayerManager extends GirafeSingleton {
  configManager: ConfigManager;
  stateManager: StateManager;

  private readonly layerClones: BaseLayer[] = [];

  get state() {
    return this.stateManager.state;
  }

  constructor(type: string) {
    super(type);

    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();

    this.stateManager.subscribe(
      /layers\.layersList\..*\.activeState/,
      (_oldActive: boolean, _newActive: boolean, layer: BaseLayer) => this.onLayerToggled(layer)
    );
    this.stateManager.subscribe('layers.layersList', (oldLayers, newLayers) =>
      this.onLayersListChanged(oldLayers, newLayers)
    );
    this.stateManager.subscribe(
      /layers\.layersList\..*\.children/,
      (oldChildren: BaseLayer[], newChildren: BaseLayer[]) => this.onChildrenListChanged(oldChildren, newChildren)
    );
  }

  private onLayersListChanged(oldLayers: BaseLayer[], newLayers: BaseLayer[]) {
    let addedLayers = newLayers;
    if (oldLayers) {
      addedLayers = newLayers.filter(
        (newLayer) => !oldLayers.find((oldLayer) => oldLayer.treeItemId === newLayer.treeItemId)
      );
    }
    this.layerClones.push(...addedLayers);
    this.activateDefaultLayers(addedLayers);
  }
  protected onChildrenListChanged(oldChildren: BaseLayer[], newChildren: BaseLayer[]) {
    // If we added a new group to the list of layers
    // Then we activate the layers that should be activated by default
    const addedLayers = newChildren.filter(
      (newChild) => !oldChildren.find((oldChild) => oldChild.treeItemId === newChild.treeItemId)
    );
    this.activateDefaultLayers(addedLayers);
  }

  public getTreeItem(treeItemId: string): BaseLayer {
    // The object is not in the list of active layers any more.
    // We look in the list of clones
    const treeItem = this.getLayerRecursive(this.layerClones, treeItemId);
    if (treeItem) {
      return treeItem;
    }

    throw new Error(`BaseLayer ${treeItemId} not found !`);
  }

  private getLayerRecursive(layers: BaseLayer[], treeItemId: string): BaseLayer | null {
    for (const layer of layers) {
      if (layer.treeItemId === treeItemId) {
        return layer;
      }
      if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
        const child = this.getLayerRecursive(layer.children, treeItemId);
        if (child) {
          return child;
        }
      }
    }

    return null;
  }

  public getFlattenedLayerTree(layers: BaseLayer[]): BaseLayer[] {
    const allLayers: BaseLayer[] = [];
    for (const layer of layers) {
      allLayers.push(layer);
      if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
        allLayers.push(...this.getFlattenedLayerTree(layer.children));
      }
    }
    return allLayers;
  }

  activateIfDefaultChecked(layer: BaseLayer) {
    if (layer.isDefaultChecked) {
      this.toggle(layer, 'on');
    }
  }

  toggle(layer: BaseLayer, state: 'on' | 'off') {
    if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
      this.toggleGroupOrTheme(layer, state);
    } else if (layer instanceof Layer) {
      this.toggleLayer(layer, state);
    }
  }

  private onLayerToggled(layer: BaseLayer) {
    if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
      // Toggle parents if necessary
      this.#manageExclusiveGroups(layer);
      this.#toggleParent(layer);
      // Toggle childs if necessary
      if (layer.activeState !== 'semi') {
        this.#toggleChilds(layer, layer.activeState);
      }
    } else if (layer instanceof Layer) {
      // Hide the legend when the layer is deactivated (if configured so)
      if (this.isLayerWithLegend(layer) && this.configManager.Config.treeview.hideLegendWhenLayerIsDeactivated) {
        if (layer.active) {
          layer.isLegendExpanded = layer.wasLegendExpanded;
        } else {
          layer.wasLegendExpanded = layer.isLegendExpanded;
          layer.isLegendExpanded = false;
        }
      }
      // Toggle parents if necessary
      this.#manageExclusiveGroups(layer);
      this.#toggleParent(layer);
    }

    this.#manageDisclaimer(layer);
  }

  #manageDisclaimer(layer: BaseLayer) {
    if (layer.active && layer.disclaimer) {
      this.state.infobox.elements.push({
        id: layer.treeItemId,
        text: layer.disclaimer,
        type: 'info'
      });
    }

    if (layer.inactive && layer.disclaimer) {
      const index = this.state.infobox.elements.findIndex((el) => el.id === layer.treeItemId);
      if (index >= 0) {
        this.state.infobox.elements.splice(index, 1);
      }
    }
  }

  toggleLayer(layer: Layer, state?: 'on' | 'off') {
    if (!(layer instanceof Layer)) {
      throw new Error('This method should only be called on leafs layers, not on groups');
    }

    let newState: 'on' | 'off';
    if (state) {
      newState = state;
    } else if (layer.activeState === 'off') {
      newState = 'on';
    } else {
      newState = 'off';
    }

    if (layer.activeState != newState) {
      console.log(`Setting Layer ${layer.name} to ${newState}`);
      this.getTreeItem(layer.treeItemId).activeState = newState;
    }
  }

  toggleGroupOrTheme(groupOrTheme: GroupLayer | ThemeLayer, state?: 'on' | 'off' | 'semi') {
    let newState: 'on' | 'off' | 'semi';
    if (state) {
      newState = state;
    } else if (groupOrTheme.activeState === 'off') {
      newState = 'on';
    } else {
      newState = 'off';
    }

    if (groupOrTheme.activeState != newState) {
      console.log(`Setting Group ${groupOrTheme.name} to ${newState}`);
      this.getTreeItem(groupOrTheme.treeItemId).activeState = newState;
    }
  }

  #toggleParent(layer: BaseLayer) {
    if (layer.parent) {
      if (
        (layer.parent instanceof GroupLayer && layer.parent.isExclusiveGroup) ||
        (layer.parent instanceof ThemeLayer && layer.parent.isExclusiveTheme)
      ) {
        if (this.#isAnyChildActive(layer.parent)) {
          this.toggleGroupOrTheme(layer.parent, 'on');
        } else {
          this.toggleGroupOrTheme(layer.parent, 'off');
        }
      } else if (this.#areAllChildrenActive(layer.parent)) {
        this.toggleGroupOrTheme(layer.parent, 'on');
      } else if (this.#areAllChildrenInactive(layer.parent)) {
        this.toggleGroupOrTheme(layer.parent, 'off');
      } else {
        this.toggleGroupOrTheme(layer.parent, 'semi');
      }
    }
  }

  #toggleChilds(group: GroupLayer | ThemeLayer, state: 'on' | 'off') {
    if (group instanceof GroupLayer && group.active && group.isExclusiveGroup && group.children.length >= 1) {
      // We activate a group, and this group is an exclusive group.
      // If there isn't any active child yet, we activate the first one
      if (!this.#isAnyChildActive(group)) {
        this.toggle(group.children[0], state);
      }
    } else {
      // In all other cases, we activate/deactivate all children
      for (const child of group.children) {
        this.toggle(child, state);
      }
    }
  }

  #manageExclusiveGroups(layer: BaseLayer) {
    // This method manages the case of exclusives groups:
    // If we have activate a layer, and if the parent group is defined as "exclusive"
    // It means only 1 child can be activated at the same time.
    // Therefore, we have to deactivate all other childs for the parent group.
    if (
      (layer.active || ((layer instanceof GroupLayer || layer instanceof ThemeLayer) && layer.semiActive)) &&
      layer.parent != null &&
      ((layer.parent instanceof GroupLayer && layer.parent.isExclusiveGroup) ||
        (layer.parent instanceof ThemeLayer && layer.parent.isExclusiveTheme))
    ) {
      // Deactivate all other layers
      for (const child of layer.parent.children) {
        const otherLayer = this.getTreeItem(child.treeItemId);
        if (
          otherLayer.treeItemId !== layer.treeItemId &&
          (otherLayer.active ||
            ((otherLayer instanceof GroupLayer || otherLayer instanceof ThemeLayer) && otherLayer.semiActive))
        ) {
          this.toggle(otherLayer, 'off');
        }
      }
    }
  }

  #areAllChildrenActive(groupOrTheme: GroupLayer | ThemeLayer) {
    let allActive = true;
    for (const child of groupOrTheme.children) {
      if (!child.active) {
        allActive = false;
      }
    }
    return allActive;
  }

  #areAllChildrenInactive(groupOrTheme: GroupLayer | ThemeLayer) {
    let allInactive = true;
    for (const child of groupOrTheme.children) {
      if (!child.inactive) {
        allInactive = false;
      }
    }
    return allInactive;
  }

  #isAnyChildActive(groupOrTheme: GroupLayer | ThemeLayer) {
    for (const child of groupOrTheme.children) {
      if (child.active) {
        return true;
      }
      if (child instanceof GroupLayer && child.semiActive) {
        // A semi active group is considered as an active child in this case
        return true;
      }
    }
    return false;
  }

  setError(layer: BaseLayer, error: string) {
    layer.hasError = true;
    layer.errorMessage = error;
    console.warn(layer.errorMessage);
  }

  unsetError(layer: BaseLayer) {
    layer.hasError = false;
    layer.errorMessage = null;
  }

  isLayerWithLegend(layer: ILayerWithLegend | Layer): layer is ILayerWithLegend {
    return (<ILayerWithLegend>layer).isLegendExpanded !== undefined;
  }

  isLayerWithFilter(layer: ILayerWithFilter | Layer): layer is ILayerWithFilter {
    return (<ILayerWithFilter>layer).filter !== undefined;
  }

  public getSortedLayers(layers: BaseLayer[]) {
    const orderedLayers = layers.slice().sort((l1: BaseLayer, l2: BaseLayer) => {
      return l1.order - l2.order;
    });
    return orderedLayers ?? [];
  }

  public activateDefaultLayers(layers: BaseLayer[]) {
    for (const layer of layers) {
      // Activate the layer by default
      this.activateIfDefaultChecked(layer);

      // Manage the legend visibility
      if (
        layer instanceof Layer &&
        !layer.active &&
        this.configManager.Config.treeview.hideLegendWhenLayerIsDeactivated &&
        this.isLayerWithLegend(layer)
      ) {
        // Hide Legend
        (layer as ILayerWithLegend).isLegendExpanded = false;
        (layer as ILayerWithLegend).wasLegendExpanded = true;
      }

      // Continue recursively
      if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
        this.activateDefaultLayers(layer.children);
      }
    }
  }
}

export default LayerManager;
