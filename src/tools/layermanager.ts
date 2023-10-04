import GirafeSingleton from "../base/GirafeSingleton";
import Layer from "../models/layer";
import ConfigManager from "./configmanager";
import StateManager from "./state/statemanager";

class LayerManager extends GirafeSingleton {

  configManager: ConfigManager;
  stateManager: StateManager;

  get state() {
    return this.stateManager.state;
  }

  constructor(type: string) {
    super(type);

    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();
  }

  getLayer(layerId: number): Layer {
    const layer = this.#getLayerRecursive(this.state.layers.layersList, layerId);
    if (layer) {
      if (layer.isLayer) {
        return layer;
      }
      throw new Error('This object is not a Layer !')
    }

    throw new Error('Layer not found !');
  }

  getGroup(groupId: number): Layer {
    const group = this.#getLayerRecursive(this.state.layers.layersList, groupId);
    if (group) {
      if (group.isGroup) {
        return group;
      }
      throw new Error('This object is not a Group !')
    }

    throw new Error('Group not found!');
  }

  #getLayerRecursive(layers: Layer[], layerId: number): Layer | null {
    for (const layer of layers) {
      if (layer.id === layerId) {
        return layer;
      }
      const child = this.#getLayerRecursive(layer.children, layerId);
      if (child) {
        return child;
      }
    }

    return null;
  }

  toggle(layer: Layer, state: 'on' | 'off', alreadyToggled: Layer[] = []) {
    if (layer.isGroup) {
      this.toggleGroup(layer, state, alreadyToggled);
    }
    else {
      this.toggleLayer(layer, state, alreadyToggled);
    }
  }

  toggleLayer(layer: Layer, state: 'on' | 'off', alreadyToggled: Layer[] = []) {
    if (!layer.isLayer) {
      throw new Error('This method should only be called on leafs layers, not on groups');
    }
    if (alreadyToggled.includes(layer)) {
      // This layer was already toggled during this cascade
      return;
    }

    let newState: 'on' | 'off';
    if (state) {
      newState = state;
    }
    else if (layer.activeState === 'off') {
      newState = 'on';
    }
    else {
      newState = 'off';
    }

    // TODO REG : To increase reactivity, move this code to a method listening to changes on activeState
    if (layer.activeState !== newState) {
      console.log(`Setting Layer ${layer.name} to ${newState}`);
      layer.activeState = newState;

      this.#manageExclusiveGroups(layer);
      this.#toggleParent(layer, alreadyToggled.concat(layer));
    }
  }

  toggleGroup(group: Layer, state: 'on' | 'off' | 'semi', alreadyToggled: Layer[] = []) {
    if (!group.isGroup) {
      throw new Error('This method should only be called on groups, not on leaf layers');
    }
    if (alreadyToggled.includes(group)) {
      // This layer was already toggled during this cascade
      return;
    }

    let newState: 'on' | 'off' | 'semi';
    if (state) {
      newState = state;
    }
    else if (group.activeState === 'off') {
      newState = 'on';
    }
    else {
      newState = 'off';
    }

    // TODO REG : To increase reactivity, move this code to a method listening to changes on activeState
    if (group.activeState !== newState) {
      console.log(`Setting Group ${group.name} to ${newState}`);
      group.activeState = newState;

      this.#manageExclusiveGroups(group);
      this.#toggleParent(group, alreadyToggled);

      if (newState === 'on' || newState === 'off') {
        this.#toggleChilds(group, newState, alreadyToggled.concat(group));
      }
    }
  }

  #toggleParent(layer: Layer, alreadyToggled: Layer[] = []) {
    if (layer.parent) {
      if (layer.parent.isExclusiveGroup) {
        if (this.#isAnyChildActive(layer.parent)) {
          this.toggleGroup(layer.parent, 'on', alreadyToggled);
        }
        else {
          this.toggleGroup(layer.parent, 'off', alreadyToggled);
        }
      }
      else if (this.#areAllChildrenActive(layer.parent)) {
        this.toggleGroup(layer.parent, 'on', alreadyToggled);
      }
      else if (this.#areAllChildrenInactive(layer.parent)) {
        this.toggleGroup(layer.parent, 'off', alreadyToggled);
      }
      else {
        this.toggleGroup(layer.parent, 'semi', alreadyToggled);
      }
    }
  }

  #toggleChilds(group: Layer, state: 'on' | 'off', alreadyToggled: Layer[] = []) {
    if (group.active && group.isExclusiveGroup && group.children.length >= 1) {
      // We activate a group, but this group is an exclusive group.
      // => Activate only the first layer
      this.toggle(group.children[0], state, alreadyToggled);
    }
    else {
      // In all other cases, we activate/deactivate all children
      for (const child of group.children) {
        this.toggle(child, state, alreadyToggled);
      }
    }
  }

  #manageExclusiveGroups(layer: Layer) {
    // This method manages the case of exclusives groups:
    // If we have activate a layer, and if the parent group is defined as "exclusive"
    // It means only 1 child can be activated at the same time.
    // Therefore, we have to deactivate all other childs for the parent group.
    if (layer.activeState === 'on' && layer.parent != null && layer.parent.isExclusiveGroup) {
      // Deactivate all other layers
      for (const child of layer.parent.children) {
        const otherLayer = this.getLayer(child.id);
        if (otherLayer.id !== layer.id && otherLayer.active) {
          this.toggle(otherLayer, 'off');
        }
      }
    }
  }

  #areAllChildrenActive(group: Layer) {
    let allActive = true;
    for (const child of group.children) {
      if (!child.active) {
        allActive = false;
      }
    }
    return allActive;
  }

  #areAllChildrenInactive(group: Layer) {
    let allInactive = true;
    for (const child of group.children) {
      if (!child.inactive) {
        allInactive = false;
      }
    }
    return allInactive;
  }

  #isAnyChildActive(group: Layer) {
    for (const child of group.children) {
      if (child.active) {
        return true;
      }
    }
    return false;
  }
  
}

export default LayerManager
