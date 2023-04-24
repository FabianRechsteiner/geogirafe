import StateManager from "../../../tools/state/statemanager";

class MenuManager {

  shadow = null;
  stateManager = StateManager.getInstance();

  ulRoot = null;

  advancedOptionsButton = null;
  toggleLegendsButton = null;
  expandAllButton = null;
  swipeButton = null;
  deleteButton = null;

  allLegendsDisplayed = true;

  constructor(shadow) {
    this.shadow = shadow;
    
  }

  get state() {
    return this.stateManager.state;
  }

  getLayer(layerId) {
    return this.state.layers.layersList.find(l => l.id === layerId);
  }

  deleteLayer(layerId) {
    const index = this.state.layers.layersList.map(l => l.id).indexOf(layerId);
    this.state.layers.layersList.splice(index, 1);
  }

  registerEvents() {
    this.ulRoot = this.shadow.getElementById('treeview-list');
    this.advancedOptionsButton = this.shadow.getElementById('options');
    this.toggleLegendsButton = this.shadow.getElementById('togglelegends');
    this.expandAllButton = this.shadow.getElementById('expandall');
    this.swipeButton = this.shadow.getElementById('swipe');
    this.deleteButton = this.shadow.getElementById('delete');

    this.advancedOptionsButton.addEventListener('click', () => this.state.treeview.advanced = !this.state.treeview.advanced);
    this.toggleLegendsButton.addEventListener('click', () => this.toggleAllLegends());
    this.expandAllButton.addEventListener('click', () => this.expandAllLayers());
    this.swipeButton.addEventListener('click', (e) => this.hideSwipe(e));
    this.deleteButton.addEventListener('click', () => this.deleteAllLayers());

    this.stateManager.subscribe('treeview.advanced', () => this.advancedOptionsToggled());
    this.stateManager.subscribe('layers.swipedLayers', () => this.swipeButton.style.display = 'inline-block');
  }

  advancedOptionsToggled() {
    if (this.state.treeview.advanced) {
      this.advancedOptionsButton.classList.add('selected');
      this.ulRoot.classList.add('advanced');
    }
    else {
      this.advancedOptionsButton.classList.remove('selected');
      this.ulRoot.classList.remove('advanced');
    }
  }

  hideSwipe() {
    this.state.layers.swipedLayers = { left:[], right:[] };
    this.swipeButton.style.display = 'none';
  }

  deleteAllLayers() {
    for (let i=0; i<this.stateManager.state.layers.layersList.length; ++i) {
      this.stateManager.state.layers.layersList[i].activeState = 'off';
    }
    this.ulRoot.innerHTML = '';
  }

  expandAllLayers() {
    for (let i=0; i<this.state.layers.layersList.length; ++i) {
      this.state.layers.layersList[i].isExpanded = true;
    }
  }

  toggleAllLegends() {
    for (let i=0; i<this.state.layers.layersList.length; ++i) {
      const l = this.state.layers.layersList[i];
      if (l.hasLegend) {
        if (this.allLegendsDisplayed) {
          // Hide
          l.isLegendExpanded = false;
          this.toggleLegendsButton.classList.remove('selected');
        }
        else {
          // Show
          l.isLegendExpanded = true;
          this.toggleLegendsButton.classList.add('selected');
        }
      }
    }

    this.allLegendsDisplayed = !this.allLegendsDisplayed;
    //this.#allLegendsDisplayedCount = 0;
  }

  // TODO REG: extract this method to a Utils class
  isNullOrUndefined(val) {
    return (val === undefined || val === null);
  }
}

export default MenuManager;