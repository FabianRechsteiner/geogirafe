import GirafeResizableElement from '../../base/GirafeResizableElement';
import type { Callback } from '../../tools/state/statemanager';
import type OlFeature from 'ol/Feature';
import { debounce } from '../../tools/debounce';
import SelectionGridManager from './tools/selectiongridmanager';
import type { TabHeader } from './tools/selectiongridmanager';

/**
 * Represents a selection grid component based on GridJs.
 * Display itself when it should be visible and have selected features.
 * To be visible, it has to be the defined selectionComponent.
 * @extends GirafeResizableElement
 */
class SelectionGridComponent extends GirafeResizableElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  private readonly eventsCallbacks: Callback[] = [];
  private readonly selectionGridManager = new SelectionGridManager();
  private isVisibleComponentSetup = false;
  private debounceOnFeaturesSelected = debounce(this.onFeaturesSelected.bind(this), 200);
  visible = false;

  constructor() {
    super('selectiongrid');
  }

  connectedCallback() {
    this.render();
    this.registerVisibilityEvents();
  }

  /**
   * Render the component regarding its visibility.
   */
  render() {
    this.visible ? this.renderComponent() : this.renderComponentEmpty();
  }

  /**
   * @returns The current array of TabHeader objects.
   */
  getTabHeaders(): TabHeader[] {
    return this.selectionGridManager.tabHeaders;
  }

  /**
   * Activates the specified tab, renders the grid, and displays the grid for the specified id.
   */
  displayGrid(id: string) {
    this.selectionGridManager.activateTab(id);
    this.render();
    this.selectionGridManager.displayGrid(id);
  }

  /**
   * Closes the panel and deselect the selected features.
   */
  closePanel() {
    this.state.interface.selectionComponentVisible = false;
    this.state.selection.selectedFeatures = [];
    super.clean();
  }

  /**
   * Renders the component by calling the necessary methods.
   * @private
   */
  private renderComponent() {
    super.render();
    super.girafeTranslate();
    this.selectionGridManager.setGridElement(this.shadow.querySelector('#grid'));
    this.activateTooltips(false, [800, 0], 'top-end');
    if (!this.isVisibleComponentSetup) {
      this.setupVisibleComponent();
    }
  }

  /**
   * Sets up the components state and side-kicks.
   * This must be called once at the first (visible) rendering.
   * @private
   */
  private setupVisibleComponent() {
    this.isVisibleComponentSetup = true;
    this.registerEvents();
  }

  /**
   * Render a placeholder, not visible component on hide.
   * Removes event registration.
   * @private
   */
  private renderComponentEmpty() {
    this.stateManager.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;
    this.isVisibleComponentSetup = false;
    this.renderEmpty();
  }

  /**
   * Event about visibility that must be always listened by this component, even hidden.
   * @private
   */
  private registerVisibilityEvents() {
    this.stateManager.subscribe('interface.selectionComponentVisible', (_oldValue, newValue) =>
      this.togglePanel(newValue)
    );
  }

  /**
   * Listen events that must be listened if the component is visible.
   * @private
   */
  private registerEvents() {
    this.eventsCallbacks.push(
      this.stateManager.subscribe('selection.selectedFeatures', (_oldFeatures, newFeatures) => {
        // Use debounce to avoid quicly closing the grid on selection change.
        this.debounceOnFeaturesSelected(newFeatures);
      })
    );
  }

  /**
   * Handles the selected features and updates the grid data accordingly or
   * close the panel if no data is selected.
   * @private
   */
  private onFeaturesSelected(features: OlFeature[] | null) {
    this.selectionGridManager.tabHeaders = [];
    // No feature ? Close.
    if (this.isNullOrUndefined(features) || features!.length <= 0) {
      this.state.interface.selectionComponentVisible = false;
      this.selectionGridManager.emptyGrid();
      return;
    }
    // Otherwise, transforms features to grid data.
    this.selectionGridManager.featuresToGridData(features!);
    // Activate and display the first tab.
    this.displayGrid(Object.keys(this.selectionGridManager.idTab)[0]);
  }

  /**
   * Toggles the panel visibility. If visible, tries to display a grid with selected feature.
   * Can only be visible if the component is the wanted selection component.
   * @private
   */
  private togglePanel(visible: boolean) {
    if (this.state.interface.selectionComponent !== 'grid') {
      if (!this.visible) {
        return;
      }
      visible = false;
    }
    this.visible = visible;
    if (visible) {
      // Will be rendered after computing selected feature.
      this.onFeaturesSelected(this.state.selection.selectedFeatures);
    } else {
      this.render();
    }
  }
}

export default SelectionGridComponent;
