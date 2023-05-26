import tippy from "tippy.js";
import GeoEvents from "../../../models/events";
import MessageManager from "../../../tools/messagemanager";
import StateManager from "../../../tools/state/statemanager";
import ConfigManager from "../../../tools/configmanager";

class IconManager {

  shadow = null;
  useCheckboxes = false;
  useLegendIcons = false;
  configManager = null;

  constructor(shadow) {
    this.shadow = shadow;

    this.configManager = ConfigManager.getInstance();

    this.configManager.loadConfig().then(() => { 
      if (this.configManager.Config.treeview.useCheckboxes) {
        this.useCheckboxes = true;
      }
      if (this.configManager.Config.treeview.useLegendIcons) {
        this.useLegendIcons = true;
      }
    });
  }

  get state() {
    return StateManager.getInstance().state;
  }

  getLayer(layerId) {
    return this.state.layers.layersList.find(l => l.id === parseInt(layerId));
  }

  deleteLayer(layerId) {
    this.deactivateLayersRecursively(layerId);

    // TODO REG : Do we want to remove the element from the list ? I'm not sure...
    // const index = this.state.layers.layersList.map(l => l.id).indexOf(layerId);
    // this.state.layers.layersList.splice(index, 1);

    // Remove element from treeview
    const li = this.shadow.getElementById(layerId);
    li.remove();
  }

  deactivateLayersRecursively(layerId) {
    const layer = this.getLayer(layerId);
    layer.activeState = 'off';

    for (let i=0; i<layer.children.length; ++i) {
      this.deactivateLayersRecursively(layer.children[i].id);
    }
  }

  changeLayerOpacity(l, reference, e) {
    const layer = this.getLayer(l.id);
    layer.opacity = e.target.value/20;
    if (layer.isTransparent) {
      reference.classList.remove('fa-regular');
      reference.classList.add('fa-solid');
      reference.classList.add('active');
    }
    else {
      reference.classList.remove('fa-solid');
      reference.classList.add('fa-regular');
      reference.classList.remove('active');
    }
  }

  getSelectionCircleId(layer) {
    return 'SEL-' + layer.id;
  }

  renderSelectionCircleIcon(container, layer) {
    const circle = document.createElement('i');
    circle.id = this.getSelectionCircleId(layer);
    circle.dataset.circle = true;
    circle.className = this.useCheckboxes ? 'fa-lg fa-regular fa-square selbox' : 'fa-xs fa-regular fa-circle selcircle';
    circle.onclick = (e) => this.toggle(layer);
    container.append(circle);
  }

  toggleSelectionCircleIcon(layer) {
    const circle = this.shadow.getElementById(this.getSelectionCircleId(layer));
    if (this.isNullOrUndefined(circle)) {
      // Circle does not exist. Just stop here
      console.warn('Why is the circle null here ?')
      return;
    }

    // active can have the values true, false or 'semi'
    if (layer.active) {
      circle.className = this.useCheckboxes ? 'fa-lg fa-solid fa-square-check selbox' : 'fa-xs fa-solid fa-circle selcircle';
    }
    else if (layer.inactive) {
      circle.className = this.useCheckboxes ? 'fa-lg fa-regular fa-square selbox' : 'fa-xs fa-regular fa-circle selcircle';
    }
    else if (layer.semiActive) {
      circle.className = this.useCheckboxes ? 'fa-lg fa-regular fa-square-check selbox' : 'fa-xs fa-solid fa-circle-half-stroke selcircle';
    }
  }

  getCaretId(layer) {
    return 'CAR-' + layer.id;
  }

  renderCaretIcon(container, layer) {
    const caret = document.createElement('i');
    caret.className = 'fa fa-caret-right selectable expand';
    caret.id = this.getCaretId(layer);
    caret.onclick = () => { 
      const l = this.getLayer(layer.id);
      l.isExpanded = !l.isExpanded; 
    };
    container.append(caret);
  }

  toggleCaretIcon(layer) {
    const caret = this.shadow.getElementById(this.getCaretId(layer));
    if (layer.isExpanded) {
      // Expand
      caret.classList.remove('fa-caret-right');
      caret.classList.add('fa-caret-down');
    }
    else {
      // Collapse
      caret.classList.remove('fa-caret-down');
      caret.classList.add('fa-caret-right');
    }
  }

  renderDeleteIcon(container, layer) {
    const del = document.createElement('i');
    del.className = 'fa fa-solid fa-xmark tool selectable del';
    del.setAttribute('tip', 'Remove this group');
    del.onclick = () => this.deleteLayer(layer.id);
    container.append(del);
  }

  renderSpacerIcon(container, type) {
    const spacer = document.createElement('i');
    spacer.className = 'spacer ' + type;
    container.append(spacer);
  }

  renderLegendIcon(container, layer) {
    const icon = document.createElement('img');
    icon.src = layer.iconUrl;
    icon.alt = 'icon for ' + layer.name;
    icon.className = 'iconurl';
    container.append(icon);
  }

  renderWmsLegendIcon(container, layer) {
    const icon = document.createElement('img');
    icon.id = layer.legendId;
    icon.alt = 'icon for ' + layer.name;
    icon.className = 'iconurl';
    container.append(icon);
  }

  renderLegendToggleIcon(container, layer) {
    const legend = document.createElement('i');
    legend.className = 'fa-solid fa-bars tool selectable legend';
    legend.setAttribute('tip', 'Toggle legend');
    legend.onclick = () => {
      const l = this.getLayer(layer.id);
      l.isLegendExpanded = !l.isLegendExpanded;
    };
    container.append(legend);
  }

  renderOpacityIcon(container, layer) {
    const opacity = document.createElement('i');
    opacity.className = 'fa-regular fa-sun tool selectable advanced opacity';
    opacity.setAttribute('tip', 'Control opacity');
    tippy(opacity, {
      trigger: 'click',
      arrow: true,
      interactive: true,
      theme: 'light',
      placement: 'bottom-end',
      content: (reference) => {
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'slider';
        slider.min = 0;
        slider.max = 20;
        slider.value = layer.opacity*20;
        slider.oninput = (e) => this.changeLayerOpacity(layer, reference, e);
        return slider;
      }
    });
    container.append(opacity);
  }

  renderLeafIcons(container, layer) {
    if (layer.isGroup) {
      this.renderCaretIcon(container, layer);
      this.renderSelectionCircleIcon(container, layer);
      this.renderDeleteIcon(container, layer);
    }
    else {
      // Spacer (replaces the caret)
      this.renderSpacerIcon(container, 'caret');

      // Manage legend 
      if (layer.isWmts) {
        this.renderSelectionCircleIcon(container, layer);
        this.renderSpacerIcon(container, 'tool');
      }
      else if (layer.isWms) {
        // Manage icon before the text
        if (this.useCheckboxes) {
          // We only want checkboxes, no icon at all
          this.renderSelectionCircleIcon(container, layer);
        }
        else if (!this.useLegendIcons) {
          // We do not want any legend icon at all
          this.renderSelectionCircleIcon(container, layer);
        }
        else if (layer.iconUrl) {
          // A custom legend icon has been defined and can be displayed
          this.renderLegendIcon(container, layer);
        }
        else if (!layer.hasLegend) {
          // We need to get the legendicon URL from openlayer
          this.renderWmsLegendIcon(container, layer);
          this.renderSpacerIcon(container, 'tool');
          MessageManager.getInstance().sendMessage({action: GeoEvents.requestLegendUrl, layer: layer});
        }
        else {
          // All other cases, just render selection icon
          this.renderSelectionCircleIcon(container, layer);
        }

        // Manage legend
        if (layer.hasLegend) {
          // A whole legend needs to be display.
          this.renderLegendToggleIcon(container, layer);
        }
        else {
          this.renderSpacerIcon(container, 'tool');
        }
      }
      else {
        // Unmanaged case : this whould not happen
        throw 'Unmanage case in the legend icon calculation.';
      }

      this.renderOpacityIcon(container, layer);

      // Add swiper icons
      const swipeLeft = document.createElement('i');
      swipeLeft.className = 'fa-solid fa-arrow-left tool selectable advanced swipe-left';
      swipeLeft.setAttribute('tip', 'Swipe layer on the left');
      swipeLeft.onclick = () => this.swipeLayer(layer, 'left');
      container.append(swipeLeft);

      const swipeRight = document.createElement('i');
      swipeRight.className = 'fa-solid fa-arrow-right tool selectable advanced swipe-right';
      swipeRight.setAttribute('tip', 'Swipe layer on the right');
      swipeRight.onclick = () => this.swipeLayer(layer, 'right');
      container.append(swipeRight);

      // On the childs, we can have a icon to zoom to the right resolution, where the layer will be visible
      if (layer.hasRestrictedResolution()) {
        const resolutionZoom = document.createElement('i');
        resolutionZoom.className = 'fg-zoom-in tool selectable zoomres';
        resolutionZoom.setAttribute('tip', 'Zoom to visible resolution');
        resolutionZoom.onclick = (e) => this.zoomToResolution(layer.minResolution, layer.maxResolution);
        container.append(resolutionZoom);
      }
    }
  }

  renderMoveIcons(li, layer) {

    const container = li.getElementsByTagName('div')[0];

    // Add move down
    const movedown = document.createElement('i');
    movedown.className = 'fa-solid fa-caret-down advanced tool selectable movedown';
    movedown.setAttribute('tip', 'Move this layer down');
    movedown.onclick = () => this.moveLayerDown(li, this.getLayer(layer.id));
    container.append(movedown);
    // But hide it if we are on the last node
    if (this.isNullOrUndefined(li.nextElementSibling) || li.nextElementSibling.nodeName !== 'LI') {
      movedown.style.visibility = 'hidden';
    }

    // Add move up 
    const moveup = document.createElement('i');
    moveup.className = 'fa-solid fa-caret-up advanced tool selectable moveup';
    moveup.setAttribute('tip', 'Move this layer up');
    moveup.onclick = () => this.moveLayerUp(li, this.getLayer(layer.id));
    container.append(moveup);
    // But hide it if we are on the first node
    if (this.isNullOrUndefined(li.previousElementSibling) || li.previousElementSibling.nodeName !== 'LI') {
      moveup.style.visibility = 'hidden';
    }
  }

  moveLayerUp(li, layer) {
    const previousLi = li.previousElementSibling;
    const previousLayer = this.getLayer(previousLi.id);
    
    // Switch order values
    const previousOrder = previousLayer.order;
    previousLayer.order = layer.order;
    layer.order = previousOrder;

    // Invert layers in treeview
    const ul = li.parentElement;
    ul.insertBefore(li, previousLi);

    // Show or hide moveup and movedown buttons
    const limoveup = li.querySelectorAll('.moveup')[0];
    const limovedown = li.querySelectorAll('.movedown')[0];
    const previouslimoveup = previousLi.querySelectorAll('.moveup')[0];
    const previouslimovedown = previousLi.querySelectorAll('.movedown')[0];
    this.switchVisibility(limoveup, previouslimoveup);
    this.switchVisibility(limovedown, previouslimovedown);
  }

  moveLayerDown(li, layer) {
    const nextLi = li.nextElementSibling;
    const nextLayer = this.getLayer(nextLi.id);
    
    // Switch order values
    const nextOrder = nextLayer.order;
    nextLayer.order = layer.order;
    layer.order = nextOrder;

    // Invert layers in treeview
    const ul = li.parentElement;
    ul.insertBefore(nextLi, li);

    // Show or hide moveup and movedown buttons
    const limoveup = li.querySelectorAll('.moveup')[0];
    const limovedown = li.querySelectorAll('.movedown')[0];
    const nextlimoveup = nextLi.querySelectorAll('.moveup')[0];
    const pnextlimovedown = nextLi.querySelectorAll('.movedown')[0];
    this.switchVisibility(limoveup, nextlimoveup);
    this.switchVisibility(limovedown, pnextlimovedown);
  }

  switchVisibility(obj1, obj2) {
    const temp = obj1.style.visibility;
    obj1.style.visibility = obj2.style.visibility;
    obj2.style.visibility = temp;
  }

  swipeLayer(layer, side) {
    const otherSide = (side === 'left') ? 'right' : 'left';

    const newSwipedLayers = {};
    // If the object is already present in the other side, we remove it
    newSwipedLayers[otherSide] = this.state.layers.swipedLayers[otherSide].filter((l) => { return l !== layer; });
    // Then, we add it to right side
    newSwipedLayers[side] = [...this.state.layers.swipedLayers[side]];
    newSwipedLayers[side].push(layer);
    // Lastly, we update the state
    this.state.layers.swipedLayers = newSwipedLayers;
  }

  zoomToResolution(minResolution, maxResolution) {
    // Because of rounding errors (for example 1.59 becomes 1.589999999999998), 
    // we zoom a bit more than just the max resolution.
    // For the moment we try with 10% more
    const resolution = maxResolution - 10/100*maxResolution;
    this.state.position.resolution = resolution;
  }

  // TODO REG: extract this method to a Utils class
  isNullOrUndefined(val) {
    return (val === undefined || val === null);
  }

  // TODO REG : Merge with the same function in treeview and move to LayerManager (when it will be created)
  toggle(layer, forcedState=null) {
    const stateLayer = this.getLayer(layer.id);
    if (forcedState !== null) {
      stateLayer.activeState = forcedState;
    }
    else if (layer.active) {
      stateLayer.activeState = 'off';
    }
    else {
      stateLayer.activeState = 'on';
      if (stateLayer.parent != null && stateLayer.parent.isExclusiveGroup) {
        // Deactivate all other layers
        for (let i = 0; i < stateLayer.parent.children.length; i++) {
          const otherLayer = this.getLayer(stateLayer.parent.children[i].id);
          if (otherLayer.id !== stateLayer.id && otherLayer.active) {
            otherLayer.activeState = 'off';
          }
        }
      }
    }
  }
}

export default IconManager;