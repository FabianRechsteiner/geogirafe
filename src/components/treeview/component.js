import tippy from 'tippy.js';
import Layer from '/models/layer';
import GeoEvents from '/models/events';
import GirafeResizableElement from '/base/GirafeResizableElement'

class TreeViewComponent extends GirafeResizableElement {

  static #template = null;
  themesUrl = null;
  servers = {};
  layers = [];
  ulRoot = null;
  advanced = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
    this.themesUrl = this.getAttribute('themes');
    this.themesUrl = this.getAttribute('themes');
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Theme, (e) => this.onThemeEvent(e.detail));
    window.addEventListener(GeoEvents.TreeView, (e) => this.onTreeViewEvent(e.detail));
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));

    this.optionsButton.addEventListener('click', (e) => this.toggleAdvancedOptions(e));
    this.swipeButton.addEventListener('click', (e) => this.toggleSwipe(e));
    this.showLegendsButton.addEventListener('click', (e) => this.showAllLegends(this, e));
    this.hideLegendsButton.addEventListener('click', (e) => this.hideAllLegends(this, e));
  }

  connectedCallback() {
    this.loadTemplate()
      .then(() => this.loadThemes()
        .then(() => {
          this.render();
          this.registerEvents();
          this.initialized();
        })
      )
  }

  initialized() {
    this.messageManager.sendMessage(GeoEvents.Init, {action: 'componentInitialized'});
  }

  async loadThemes() {
    const response = await fetch(this.themesUrl);
    const content = await response.json();
    this.servers = content["ogcServers"];
  }

  async loadTemplate() {
    if (TreeViewComponent.#template !== null) {
      // Template was already loaded. Nothing to do.
      return;
    }
    // Otherwise, load the template
    const response = await fetch('/components/treeview/template.html');
    const content = await response.text();
    TreeViewComponent.#template = document.createElement('template');
    TreeViewComponent.#template.innerHTML = content;
  }

  render() {
    this.shadow.appendChild(TreeViewComponent.#template.content.cloneNode(true));
    this.makeResizable();

    this.ulRoot = this.shadow.querySelector('#treeview-list');
    this.optionsButton = this.shadow.querySelector('#options');
    this.swipeButton = this.shadow.querySelector('#swipe');
    this.showLegendsButton = this.shadow.querySelector('#showlegends');
    this.hideLegendsButton = this.shadow.querySelector('#hidelegends');
  }

  renderChilds(liParent, elem, parentServer) {
    // Add new sub-list
    const ulChild = document.createElement('ul');
    ulChild.style.display = 'none';
    liParent.appendChild(ulChild);
    elem.children.forEach(child => {
      this.renderLeaf(ulChild, child, parentServer);
    });
  }

  renderLeaf(ulParent, elem, parentServer) {
    // Create new leaf
    const li = document.createElement('li');
    ulParent.appendChild(li);

    // If a server is defined on this node, we use it.
    // Otherwise, we use the server of the parent
    const childServer = (elem.ogcServer) ? elem.ogcServer : parentServer;

    // Create Layer
    const layer = this.createLayer(elem, childServer);
    li.dataset.layerid = layer.id;

    // Add icons
    this.renderLeafIcons(li, layer);
    // Add label
    this.renderLeafLabel(li, layer);
    
    // Append childs if any
    if (elem.children !== undefined) {
      this.renderChilds(li, elem, childServer);
    }
  }

  createLayer(elem, server) {
      let url = null;
      if (server) {
        url = this.servers[server].url
      }
      else {
        console.log('NOT OGC SERVER FOR ' + elem.name);
      }
      const layer = new Layer(elem, server, url);
      this.layers.push(layer);

      // The id is the index of the layer in the layer list
      layer.id = this.layers.length - 1;
      layer.order = layer.id;
      return layer;
  }

  renderSelectionCircle(li) {
    const circle = document.createElement('i');
    circle.dataset.circle = true;
    circle.className = 'fa-xs fa-regular fa-circle';
    li.append(circle);
  }

  renderDeleteIcon(li, layer) {
    const del = document.createElement('i');
    del.className = 'fa fa-solid fa-xmark tool selectable';
    del.setAttribute('tip', 'Remove this group');
    del.onclick = (e) => this.deleteLayer(this, layer, e);
    li.append(del);
  }

  renderLeafIcons(li, layer) {
    // This function returns true if a placeholder for a whole legend mut be added
    // False is not placeholder is needed
    if (layer.isGroup) {
      // We are not on a child layer
      // => Add caret
      const caret = document.createElement('i');
      caret.className = 'fa fa-caret-right selectable';
      caret.onclick = (e) => this.expand(this, e);
      li.append(caret);
      // Add selection icon
      this.renderSelectionCircle(li);
      // Add delete icon
      this.renderDeleteIcon(li, layer);
    }
    else {
      // We are on a child
      // => Add spacer (replaces the caret)
      const spacer = document.createElement('i');
      li.append(spacer);

      // => Add iconUrl if any
      if (layer.iconUrl) {
        // A custom Legend icon has been defined.
        // => We just use it
        const icon = document.createElement('img');
        icon.src = layer.iconUrl;
        icon.className = 'iconurl';
        li.append(icon);
      }
      else if (layer.hasLegend) {
        // A whole legend needs to be display.
        // => We add a legend button and the legend circle
        this.renderSelectionCircle(li)

        // Add icon for legend toggle
        const legend = document.createElement('i');
        //legend.className = 'fg-map-legend tool selectable';
        legend.className = 'fa-solid fa-bars tool selectable';
        legend.setAttribute('tip', 'Toggle legend');
        legend.onclick = () => this.toggleLegend(this, layer.legendId);
        li.append(legend);
      }
      else {
        // Last case :
        // We need to get the legendicon URL from openlayer
        // before we can show the legend icon
        const icon = document.createElement('img');
        icon.id = layer.legendId;
        icon.className = 'iconurl';
        li.append(icon);

        this.messageManager.sendMessage(GeoEvents.TreeView, {action: 'requestLegendUrl', layer: layer});
      }

      // If we didn't add any icon for legend, we add a spacer
      if (!layer.hasLegend) {
        const legendSpacer = document.createElement('i');
        legendSpacer.className = 'tool';
        li.append(legendSpacer);
      }

      // Add an icon to control the layer opacity
      const opacity = document.createElement('i');
      //opacity.className = 'fg-layer-alt tool selectable advanced';
      opacity.className = 'fa-regular fa-sun tool selectable advanced';
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
          slider.oninput = (e) => this.changeOpacity(layer, reference, e);
          return slider;
        }
      });
      li.append(opacity);

      // On the childs, we can have a icon to zoom to the right resolution, where the layer will be visible
      if (layer.hasRestrictedResolution()) {
        const resolutionZoom = document.createElement('i');
        resolutionZoom.className = 'fg-zoom-in tool selectable';
        resolutionZoom.setAttribute('tip', 'Zoom to visible resolution');
        resolutionZoom.onclick = (e) => this.zoomToResolution(layer.minResolution, layer.maxResolution);
        li.append(resolutionZoom);
      }
    }
  }

  deleteLayer(_this, layer, e) {
    const li = e.target.parentElement;

    // First deactivate layer
    if (layer.isGroup) {
      const toggledLayers = this.toggleChilds(li, false);
      this.messageManager.sendMessage(GeoEvents.TreeView, {action: 'layerListDisabled', layerList: toggledLayers});
    }

    // Then set the value in the list to null
    // Caution : do not filter the list to remove the layer from it, 
    // because the position in the list is the id of the layer
    // and is used as reference in the TreeView
    // TODO REG: change this because this can lead to errors
    const index = this.layers.indexOf(layer);
    this.layers[index] = null;

    // Then remove element from treeview
    li.remove();
  }

  changeOpacity(layer, reference, e) {
    layer.opacity = e.target.value/20;
    if (layer.isTransparent) {
      // reference.classList.remove('fg-layer-alt');
      // reference.classList.add('fg-layer-alt-o');
      reference.classList.remove('fa-regular');
      reference.classList.add('fa-solid');
    }
    else {
      // reference.classList.remove('fg-layer-alt-o');
      // reference.classList.add('fg-layer-alt');
      reference.classList.remove('fa-solid');
      reference.classList.add('fa-regular');
    }
    this.messageManager.sendMessage(GeoEvents.Map, {action: 'opacityChanged', layer: layer});
  }

  zoomToResolution(minResolution, maxResolution) {
    // Because of rounding errors (for example 1.59 becomes 1.589999999999998), 
    // we zoom a bit more than just the max resolution.
    // For the moment we try with 10% more
    const resolution = maxResolution - 10/100*maxResolution;
    this.messageManager.sendMessage(GeoEvents.Map, {action: 'zoomToResolution', resolution: resolution });
  }

  toggleLegend(_this, legendId, force=false, visible=false) {
    const legend = _this.shadow.querySelector('#' + legendId);
    if (force && visible) {
      legend.style.display = 'block';
    }
    else if (force && !visible) {
      legend.style.display = 'none';
    }
    else if (legend.style.display === 'none') {
      legend.style.display = 'block';
    }
    else {
      legend.style.display = 'none';
    }
  }
  
  renderLeafLabel(li, layer) {
    // Add label
    const span = document.createElement('span');
    span.setAttribute('i18n', 'girafe');
    span.textContent = layer.name;
    span.className = 'selectable';
    span.onclick = (e) => this.toggle(this, e, layer);
    li.appendChild(span);

    if (layer.isLayer) {
      // We are on a layer linked to a server.
      if (layer.hasRestrictedResolution())
      {
        span.dataset.minResolution = layer.minResolution;
        span.dataset.maxResolution = layer.maxResolution;
      }
    }
  }

  expand(_this, e) {
    const ulChild = e.target.parentElement.getElementsByTagName('ul')[0];
    if (ulChild.style.display === 'none') {
      ulChild.style.display = 'block';
      e.target.className = 'fa fa-caret-down selectable';
      this.messageManager.sendMessage(GeoEvents.TreeView, {action: 'groupOpened', group: e.target.innerHTML});
    }
    else {
      ulChild.style.display = 'none';
      e.target.className = 'fa fa-caret-right selectable';
      this.messageManager.sendMessage(GeoEvents.TreeView, {action: 'groupClosed', group: e.target.innerHTML});
    }
  }

  toggle(_this, e, layer) {
    const li = e.target.parentElement;

    const setActive = !(layer.active);
    this.toggleLeaf(li, layer, setActive);

    // Toggle childs
    if (layer.isGroup) {
      const toggledLayers = this.toggleChilds(li, setActive);
      const action = (setActive) ? 'layerListEnabled' : 'layerListDisabled';
      this.messageManager.sendMessage(GeoEvents.TreeView, {action: action, layerList: toggledLayers});
    }

    // Toggle parent if necessary
    this.toggleParent(li);

    if (layer.isLayer) {
      // We have data on this layer.
      // => We are on a leaf with layer infos
      // We send a message to activate/deactivate this layer
      const action = (layer.active) ? 'layerEnabled' : 'layerDisabled';
      this.messageManager.sendMessage(GeoEvents.TreeView, {action: action, layer: layer});
    }
  }

  toggleLeaf(li, layer, setActive) {
    const circle = li.querySelector('[data-circle="true"]');
    let circleClass = null;

    layer.active = setActive;
    if (setActive) {
      li.className = 'active';
      circleClass = 'fa-xs fa-solid fa-circle';
    }
    else {
      li.className = '';
      circleClass = 'fa-xs fa-regular fa-circle';
    }

    if (circle !== null) {
      // There is a selection circle (no legend icon)
      circle.className = circleClass;
    }
  }

  toggleChilds(li, setActive) {
    const ul = li.getElementsByTagName('ul')[0];
    if (this.isNullOrUndefined(ul)) {
      // We are on the last leaf.
      // => Stop here
      return [];
    }

    let toggledLayers = [];
    const childLis = ul.getElementsByTagName('li');
    for (let i=0; i<childLis.length; i++) {
      const childLi = childLis[i];
      const layer = this.layers[childLi.dataset.layerid];
      if ((setActive && !layer.active) || (!setActive && !layer.inactive)) {
        //The layer is not in the right state yet.
        this.toggleLeaf(childLi, layer, setActive);
        if (layer.isLayer) {
          toggledLayers.push(layer);
        }
      }
    }

    return toggledLayers;
  }

  toggleParent(li) {
    const ul = li.parentElement;
    if (this.isNullOrUndefined(ul) || ul === this.ulRoot) {
      // We get out the tree-view (or to the root element).
      // Just stop here
      return;
    }

    let allActive = true;
    let allInactive = true;

    const childLis = ul.getElementsByTagName('li');
    for (let i=0; i<childLis.length; i++) {
      const childLi = childLis[i];
      const layer = this.layers[childLi.dataset.layerid];
      if (layer.active) {
        allInactive = false;
      }
      else if (layer.inactive) {
        allActive = false;
      }
      else {
        // layer is semi-active
        allActive = false;
        allInactive = false;
      }
    }

    const liParent = ul.parentElement;
    const layerParent = this.layers[liParent.dataset.layerid];
    const circle = liParent.getElementsByTagName('i')[1];
    
    let stateChanged = false;
    if (allActive && !layerParent.active) {
      // Activate parent
      layerParent.active = true;
      liParent.className = 'active';
      circle.className = 'fa-xs fa-solid fa-circle';
      stateChanged = true;
    }
    else if (allInactive && !layerParent.inactive) {
      // Deactivate parent
      layerParent.active = false;
      liParent.className = '';
      circle.className = 'fa-xs fa-regular fa-circle';
      stateChanged = true;
    }
    else if (!layerParent.semiactive) {
      // Semi-active
      layerParent.active = 'semi';
      liParent.className = '';
      circle.className = 'fa-xs fa-solid fa-circle-half-stroke';
      stateChanged = true;
    }

    if (stateChanged) {
      // Recursively call on parent
      this.toggleParent(liParent);
    }
  }

  onThemeEvent(details) {
    if (details.action === 'themeChanged') {
      this.onChangeTheme(details.theme);
    }
  }

  onTreeViewEvent(details) {
    if (details.action === 'responseLegendUrl') {
      this.onLegendUrlChanged(details.id, details.url);
    }
  }

  onMapEvent(details) {
    if (details.action === 'resolutionChanged') {
      this.onResolutionChanged(details.resolution);
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
    // Clear existing TreeView;
    this.ulRoot.innerHTML = '';
    this.layers = [];

    // Add the current theme
    theme.children.forEach(elem => {
      this.renderLeaf(this.ulRoot, elem, null);
    });

    // Some objects needs to be added at the end of the rendering, 
    // because they use the siblings fo their configuration (visibility)
    this.postRender();

    this.activateAdvancedMode();
    this.activateTooltips(false, [800, 0], 'right');
  }

  postRender() {
    const lis = this.ulRoot.getElementsByTagName('li');
    for (let i=0; i<lis.length; i++) {
      const li = lis[i];
      const layer = this.layers[li.dataset.layerid];
      if (layer.isLayer) {
        this.renderMoveIcons(li, layer);
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
    legendimg.className = 'legend';
    li.append(legendimg);
    legendimg.style.display = (layer.isLegendExpanded) ? 'block' : 'none';
    // Request legend image from openlayers
    this.messageManager.sendMessage(GeoEvents.TreeView, {action: 'requestLegendUrl', layer: layer});
  }

  renderMoveIcons(li, layer) {

    // Add move down
    const movedown = document.createElement('i');
    movedown.className = 'fa-solid fa-square-caret-down advanced tool selectable movedown';
    movedown.setAttribute('tip', 'Move this layer down');
    movedown.onclick = (e) => this.moveLayerDown(this, layer, e);
    li.append(movedown);
    // But hide it if we are on the last node
    if (this.isNullOrUndefined(li.nextElementSibling) || li.nextElementSibling.nodeName !== 'LI') {
      movedown.style.visibility = 'hidden';
    }

    // Add move up 
    const moveup = document.createElement('i');
    moveup.className = 'fa-solid fa-square-caret-up advanced tool selectable moveup';
    moveup.setAttribute('tip', 'Move this layer up');
    moveup.onclick = (e) => this.moveLayerUp(this, layer, e);
    li.append(moveup);
    // But hide it if we are on the first node
    if (this.isNullOrUndefined(li.previousElementSibling) || li.previousElementSibling.nodeName !== 'LI') {
      moveup.style.visibility = 'hidden';
    }
  }

  moveLayerUp(_this, layer, e) {
    const li = e.target.parentElement;
    const previousLi = li.previousElementSibling;
    const previousLayer = _this.layers[previousLi.dataset.layerid];
    
    // Switch order values
    const previousOrder = previousLayer.order;
    previousLayer.order = layer.order;
    layer.order = previousOrder;

    // Invert layers in treeview
    const ul = li.parentElement;
    ul.insertBefore(li, previousLi);

    // Show or hide moveup and movedown buttons
    const limoveup = li.getElementsByClassName('moveup')[0];
    const limovedown = li.getElementsByClassName('movedown')[0];
    const previouslimoveup = previousLi.getElementsByClassName('moveup')[0];
    const previouslimovedown = previousLi.getElementsByClassName('movedown')[0];
    this.switchVisibility(limoveup, previouslimoveup);
    this.switchVisibility(limovedown, previouslimovedown);

    // Refresh Map
    this.messageManager.sendMessage(GeoEvents.Map, {action: 'orderChanged', layers: [previousLayer, layer]});
  }

  moveLayerDown(_this, layer, e) {
    const li = e.target.parentElement;
    const nextLi = li.nextElementSibling;
    const nextLayer = _this.layers[nextLi.dataset.layerid];
    
    // Switch order values
    const nextOrder = nextLayer.order;
    nextLayer.order = layer.order;
    layer.order = nextOrder;

    // Invert layers in treeview
    const ul = li.parentElement;
    ul.insertBefore(nextLi, li);

    // Show or hide moveup and movedown buttons
    const limoveup = li.getElementsByClassName('moveup')[0];
    const limovedown = li.getElementsByClassName('movedown')[0];
    const nextlimoveup = nextLi.getElementsByClassName('moveup')[0];
    const pnextlimovedown = nextLi.getElementsByClassName('movedown')[0];
    this.switchVisibility(limoveup, nextlimoveup);
    this.switchVisibility(limovedown, pnextlimovedown);

    // Refresh Map
    this.messageManager.sendMessage(GeoEvents.Map, {action: 'orderChanged', layers: [nextLayer, layer]});
  }

  switchVisibility(obj1, obj2) {
    const temp = obj1.style.visibility;
    obj1.style.visibility = obj2.style.visibility;
    obj2.style.visibility = temp;
  }

  toggleAdvancedOptions(e) {
    this.advanced = !this.advanced;
    if (this.advanced) {
      e.target.classList.add('selected');
    }
    else {
      e.target.classList.remove('selected');
    }
    this.activateAdvancedMode();
  }

  activateAdvancedMode() {
    let display = (this.advanced) ? 'block' : 'none';
    const elements = this.ulRoot.getElementsByClassName('advanced');
    for (let i=0; i<elements.length; i++) {
      elements[i].style.display = display;
    }
  }

  showAllLegends(_this, e) {
    _this.layers.forEach(l => {
      if (l.hasLegend) {
        _this.toggleLegend(_this, l.legendId, true, true);
      }
    });
  }

  hideAllLegends(_this, e) {
    _this.layers.forEach(l => {
      if (l.hasLegend) {
        _this.toggleLegend(_this, l.legendId, true, false);
      }
    });
  }
}

customElements.define('girafe-tree-view', TreeViewComponent);

export default TreeViewComponent;
