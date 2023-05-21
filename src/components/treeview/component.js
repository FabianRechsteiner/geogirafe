import GeoEvents from '../../models/events';
import GirafeResizableElement from '../../base/GirafeResizableElement'
import IconManager from './tools/iconmanager';
import MenuManager from './tools/menumanager';

class TreeViewComponent extends GirafeResizableElement {

  ulRoot = null;

  // To manage if all legends are visible or not
  /*#allLegendsDisplayed = true;
  get allLegendsDisplayed() {
    return this.#allLegendsDisplayed;
  }
  set allLegendsDisplayed(value) {
    this.#allLegendsDisplayed = value;
    if (value) {
      this.toggleLegendsButton.classList.add('selected');
    }
    else {
      this.toggleLegendsButton.classList.remove('selected');
    }
  }

  #allLegendsDisplayedCount = 0;
  get allLegendsDisplayedCount() {
    return this.#allLegendsDisplayedCount;
  }
  set allLegendsDisplayedCount(value) {
    if (value === 0)
    {
      // Return to initial state
      this.allLegendsDisplayed = !this.allLegendsDisplayed;
    }
    else if (this.#allLegendsDisplayedCount === 0 && (value === 1 || value === -1)) {
      // This is the first operation coming from 0
      // => Change state
      this.allLegendsDisplayed = !this.allLegendsDisplayed;
    }
    this.#allLegendsDisplayedCount = value;
  }*/
  
  // To manage if all layers are expanded or not
  /*#allLayersExpanded = false;
  get allLayersExpanded() {
    return this.#allLayersExpanded;
  }
  set allLayersExpanded(value) {
    this.#allLayersExpanded = value;
    if (value) {
      this.expandAllButton.classList.add('selected');
    }
    else {
      this.expandAllButton.classList.remove('selected');
    }
  }

  #allLayersExpandedCount = 0;
  get allLayersExpandedCount() {
    return this.#allLayersExpandedCount;
  }
  set allLayersExpandedCount(value) {
    if (value === 0)
    {
      // Return to initial state
      this.allLayersExpanded = !this.allLayersExpanded;
    }
    else if (this.#allLayersExpandedCount === 0 && (value === 1 || value === -1)) {
      // This is the first operation coming from 0
      // => Change state
      this.allLayersExpanded = !this.allLayersExpanded;
    }
    this.#allLayersExpandedCount = value;
  }*/



  iconManager = new IconManager(this.shadow);
  menuManager = new MenuManager(this.shadow);

  constructor() {
    super('treeview');
  }

  // Extract this method and similar to Utils class
  getLayer(layerId) {
    return this.state.layers.layersList.find(l => l.id === layerId);
  }

  registerEvents() {
    this.messageManager.register(this.onCustomGirafeEvent.bind(this));

    this.stateManager.subscribe('position', (oldPosition, newPosition) => this.onResolutionChanged(newPosition.resolution));
    this.stateManager.subscribe('selectedTheme', (oldTheme, newTheme) => this.onChangeTheme(newTheme));
    this.stateManager.subscribe('layers.layersList.[0-9]*.isExpanded', (oldValue, newValue, layer) => this.expand(layer, newValue));
    this.stateManager.subscribe('layers.layersList.[0-9]*.activeState', (oldValue, newValue, layer) => this.activateStateChanged(layer));
    this.stateManager.subscribe('layers.layersList.[0-9]*.isLegendExpanded', (oldValue, newValue, layer) => this.toggleLegend(layer));

    this.menuManager.registerEvents();
  }

  connectedCallback() {
    this.loadTemplate()
      .then(() => {
        this.render();
        super.translate();
        this.registerEvents();
        //super.initialized();
      });
  }

  render() {
    super.render();

    this.ulRoot = this.shadow.querySelector('#treeview-list');


    this.activateTooltips(false, [800, 0], 'right');
  }

  renderLeaf(ulParent, layer) {
    // Create new leaf
    const li = document.createElement('li');
    li.id = layer.id;
    ulParent.appendChild(li);

    // Create container div
    const container = document.createElement('div');
    li.appendChild(container);

    // Add icons
    this.iconManager.renderLeafIcons(container, layer);
    // Add label
    this.renderLeafLabel(container, layer);
    
    // Append childs if any
    if (layer.children.length > 0) {
      const ulChild = document.createElement('ul');
      ulChild.style.display = 'none';
      container.appendChild(ulChild);

      layer.children.forEach(childLayer => {
        this.renderLeaf(ulChild, childLayer);
      });
    }
  }

  zoomToResolution(minResolution, maxResolution) {
    // Because of rounding errors (for example 1.59 becomes 1.589999999999998), 
    // we zoom a bit more than just the max resolution.
    // For the moment we try with 10% more
    const resolution = maxResolution - 10/100*maxResolution;
    this.state.position.resolution = resolution;
  }

  toggleLegend(layer, force=false, visible=false) {
    const legend = this.shadow.getElementById(layer.legendId);
    if (layer.isLegendExpanded) {
      legend.style.display = 'block';
      //this.allLegendsDisplayedCount++;
    }
    else {
      legend.style.display = 'none';
      //this.allLegendsDisplayedCount--;
    }
  }
  
  renderLeafLabel(container, layer) {
    // Add label
    const span = document.createElement('span');
    span.setAttribute('i18n', layer.name);
    span.className = 'selectable';
    span.onclick = (e) => this.toggle(layer);
    container.appendChild(span);

    if (layer.isLayer) {
      // We are on a layer linked to a server.
      if (layer.hasRestrictedResolution())
      {
        span.dataset.minResolution = layer.minResolution;
        span.dataset.maxResolution = layer.maxResolution;
      }
    }
  }

  expand(layer, isExpanded) {
    const li = this.shadow.getElementById(layer.id);
    const ulChild = li.getElementsByTagName('ul')[0];
    if (layer.isGroup) {
      this.iconManager.toggleCaretIcon(layer);
      if (isExpanded) {
        // Expand
        ulChild.style.display = 'block';
        //this.allLayersExpandedCount++;
      }
      else {
        // Collapse
        ulChild.style.display = 'none';
        //this.allLayersExpandedCount--;
      }
    }
  }

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

  activateStateChanged(layer) {
    console.log(`Layer ${layer.name} has state ${layer.activeState}`);
    this.iconManager.toggleSelectionCircleIcon(layer);
    const li = this.shadow.getElementById(layer.id);
    if (layer.active) {
      li.className = 'active';
    }
    else {
      li.className = '';
    }
    
    // Toggle childs
    if (layer.isGroup && !layer.semiActive) {
      if (layer.active && layer.isExclusiveGroup && layer.children.length >= 1) {
        // We activate a group, but this group is an exclusive group.
        // => Activate only the first layer
        this.toggle(layer.children[0], 'on');
      }
      else {
        // In all other cases, we activate/deactivate all children
        const forcedState = (layer.active) ? 'on' : 'off';
        for (let i=0; i<layer.children.length; ++i) {
          this.toggle(layer.children[i], forcedState);
        }
      }
    }

    // Toggle parent if necessary
    if (layer.parent != null) {
      if (layer.parent.isExclusiveGroup) {
        if (layer.parent.isAnyChildActive) {
          this.toggle(layer.parent, 'on');
        }
        else {
          this.toggle(layer.parent, 'off');
        }
      }
      else {
        if (layer.parent.areAllChildrenActive) {
          this.toggle(layer.parent, 'on');
        }
        else if (layer.parent.areAllChildrenInactive) {
          this.toggle(layer.parent, 'off');
        }
        else {
          this.toggle(layer.parent, 'semi');
        }
      }
    }
  }

  onCustomGirafeEvent(details) {
    if (details.action === GeoEvents.responseLegendUrl) {
      this.onLegendUrlChanged(details.id, details.url);
    }
  }

  onResolutionChanged(resolution) {
    const spans = this.ulRoot.getElementsByTagName('span');
    for (let i=0; i<spans.length; i++) {
      const span = spans[i];
      let ok = false;
      if (this.isNullOrUndefined(span.dataset.maxResolution) || this.isNullOrUndefined(span.dataset.minResolution)) {
        // No resolution. Always visible
        ok = true;
      }
      else if (resolution < span.dataset.maxResolution && resolution > span.dataset.minResolution) {
        // Layer is visible for the current resolution
        ok = true;
      }

      if (ok) {
        span.classList.add('resok');
        span.classList.remove('resnok');
      }
      else {
        span.classList.add('resnok');
        span.classList.remove('resok');
      }
    }
  }

  onLegendUrlChanged(id, url) {
    const img = this.shadow.querySelector('#' + id);
    img.src = url;
  }

  onChangeTheme(theme) {
    // Clear existing TreeView
    this.ulRoot.innerHTML = '';

    // Add the current theme
    theme.layersTree.forEach(layer => {
      this.renderLeaf(this.ulRoot, layer);
    });

    // Some objects needs to be added at the end of the rendering, 
    // because they use the siblings fo their configuration (visibility)
    this.postRender();

    this.activateTooltips(false, [800, 0], 'right');
    super.translate();

    // Active default checked layers
    for (let i=0; i<this.state.layers.layersList.length; ++i) {
      const layer = this.state.layers.layersList[i];
      if (layer.isDefaultChecked) {
        layer.activeState = 'on';
      }
      if (layer.isGroup && layer.isDefaultExpanded) {
        layer.isExpanded = true;
      }
    }
  }

  postRender() {
    const lis = this.ulRoot.getElementsByTagName('li');
    for (let i=0; i<lis.length; i++) {
      const li = lis[i];
      const layer = this.state.layers.layersList.find(l => l.id === parseInt(li.id));
      if (layer.isLayer) {
        this.iconManager.renderMoveIcons(li, layer);
        if (layer.hasLegend) {
          this.renderLegend(li, layer);
        }
      }
    }
  }

  renderLegend(li, layer) {
    // Add a image for the legend.
    const legendimg = document.createElement('img');
    legendimg.id = layer.legendId;
    legendimg.alt = 'legend for ' + layer.name;
    legendimg.className = 'legend';
    li.append(legendimg);
    legendimg.style.display = (layer.isLegendExpanded) ? 'block' : 'none';
    if (!this.isNullOrUndefinedOrBlank(layer.legendImage)) {
      // We can simply set the url
      legendimg.src = layer.legendImage;
    }
    else {
      // Request legend image from openlayers
      this.messageManager.sendMessage({action: GeoEvents.requestLegendUrl, layer: layer});
    }
  }
}

customElements.define('girafe-tree-view', TreeViewComponent);

export default TreeViewComponent;
