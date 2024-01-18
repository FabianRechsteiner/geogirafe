import GirafeSingleton from '../base/GirafeSingleton';
import BaseLayer from '../models/layers/baselayer';
import GroupLayer from '../models/layers/grouplayer';
import Layer from '../models/layers/layer';
import ConfigManager from './configmanager';
import StateManager from './state/statemanager';
import LayerWms from '../models/layers/layerwms';

class LayerManager extends GirafeSingleton {
  configManager: ConfigManager;
  stateManager: StateManager;

  hideLegendWhenLayerIsDeactivated: boolean = false;

  get state() {
    return this.stateManager.state;
  }

  constructor(type: string) {
    super(type);

    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();

    this.configManager.loadConfig().then(() => {
      this.hideLegendWhenLayerIsDeactivated =
        this.configManager.Config.treeview.hideLegendWhenLayerIsDeactivated ?? false;
    });

    this.stateManager.subscribe(
      /layers\.layersList\..*\.activeState/,
      (_oldActive: boolean, _newActive: boolean, layer: BaseLayer) => this.onLayerToggled(layer)
    );
  }

  getTreeItem(treeItemId: string): BaseLayer {
    const treeItem = this.#getLayerRecursive(this.state.layers.layersList, treeItemId);
    if (treeItem) {
      return treeItem;
    }
    throw new Error(`BaseLayer ${treeItemId} not found !`);
  }

  #getLayerRecursive(layers: BaseLayer[], treeItemId: string): BaseLayer | null {
    for (const layer of layers) {
      if (layer.treeItemId === treeItemId) {
        return layer;
      }
      if (layer instanceof GroupLayer) {
        const child = this.#getLayerRecursive(layer.children, treeItemId);
        if (child) {
          return child;
        }
      }
    }

    return null;
  }

  activateIfDefaultChecked(layer: BaseLayer) {
    if (layer.isDefaultChecked) {
      this.toggle(layer, 'on');
    }
  }

  initializeLegends(layer: LayerWms) {
    if (layer.inactive && this.hideLegendWhenLayerIsDeactivated) {
      layer.isLegendExpanded = false;
    }
  }

  toggle(layer: BaseLayer, state: 'on' | 'off') {
    if (layer instanceof GroupLayer) {
      this.toggleGroup(layer, state);
    } else if (layer instanceof Layer) {
      this.toggleLayer(layer, state);
    }
  }

  onLayerToggled(layer: BaseLayer) {
    if (layer instanceof GroupLayer) {
      // Toggle parents if necessary
      this.#manageExclusiveGroups(layer);
      this.#toggleParent(layer);
      // Toggle childs if necessary
      if (layer.activeState !== 'semi') {
        this.#toggleChilds(layer, layer.activeState);
      }
    } else if (layer instanceof Layer) {
      // Hide the legend when the layer is deactivated (if configured so)
      if (layer instanceof LayerWms && this.hideLegendWhenLayerIsDeactivated) {
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
  }

  toggleLayer(layer: Layer, state: 'on' | 'off') {
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
      layer.activeState = newState;
    }
  }

  toggleGroup(group: GroupLayer, state: 'on' | 'off' | 'semi') {
    let newState: 'on' | 'off' | 'semi';
    if (state) {
      newState = state;
    } else if (group.activeState === 'off') {
      newState = 'on';
    } else {
      newState = 'off';
    }

    if (group.activeState != newState) {
      console.log(`Setting Group ${group.name} to ${newState}`);
      group.activeState = newState;
    }
  }

  #toggleParent(layer: BaseLayer) {
    if (layer.parent) {
      if (layer.parent.isExclusiveGroup) {
        if (this.#isAnyChildActive(layer.parent)) {
          this.toggleGroup(layer.parent, 'on');
        } else {
          this.toggleGroup(layer.parent, 'off');
        }
      } else if (this.#areAllChildrenActive(layer.parent)) {
        this.toggleGroup(layer.parent, 'on');
      } else if (this.#areAllChildrenInactive(layer.parent)) {
        this.toggleGroup(layer.parent, 'off');
      } else {
        this.toggleGroup(layer.parent, 'semi');
      }
    }
  }

  #toggleChilds(group: GroupLayer, state: 'on' | 'off') {
    if (group.active && group.isExclusiveGroup && group.children.length >= 1) {
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
      (layer.active || (layer instanceof GroupLayer && layer.semiActive)) &&
      layer.parent != null &&
      layer.parent.isExclusiveGroup
    ) {
      // Deactivate all other layers
      for (const child of layer.parent.children) {
        const otherLayer = this.getTreeItem(child.treeItemId);
        if (
          otherLayer.treeItemId !== layer.treeItemId &&
          (otherLayer.active || (otherLayer instanceof GroupLayer && otherLayer.semiActive))
        ) {
          this.toggle(otherLayer, 'off');
        }
      }
    }
  }

  #areAllChildrenActive(group: GroupLayer) {
    let allActive = true;
    for (const child of group.children) {
      if (!child.active) {
        allActive = false;
      }
    }
    return allActive;
  }

  #areAllChildrenInactive(group: GroupLayer) {
    let allInactive = true;
    for (const child of group.children) {
      if (!child.inactive) {
        allInactive = false;
      }
    }
    return allInactive;
  }

  #isAnyChildActive(group: GroupLayer) {
    for (const child of group.children) {
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
}

export default LayerManager;
