import GirafeDraggableElement from '../../base/GirafeDraggableElement';
import type { Callback } from '../../tools/state/statemanager';
import { debounce } from '../../tools/debounce';
import type OlFeature from 'ol/Feature';
import FeatureToGridDataById from '../../tools/featuretogriddatabyid';
import type { GridDataById } from '../../tools/featuretogriddatabyid';
import { getValidIndex } from '../../tools/utils';

/**
 * Represents a Feature displayed in the SelectionWindowComponent.
 */
interface WindowFeature {
  id: string;
  feature: OlFeature;
  notOlProperties: Record<string, unknown>;
}

/**
 * Represents a draggable and resizable selection window component.
 * Display itself when it should be visible and have selected features.
 * To be visible, it has to be the defined selectionComponent.
 */
class SelectionWindowComponent extends GirafeDraggableElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  private readonly eventsCallbacks: Callback[] = [];
  private isVisibleComponentSetup = false;
  private debounceOnFeaturesSelected = debounce(this.onFeaturesSelected.bind(this), 200);
  private featureToGridData = new FeatureToGridDataById({ removeEmptyColumns: false });
  private windowFeatures: WindowFeature[] = [];
  visible = false;
  focusedIndex = 0;
  maxIndex = 0;
  displayedProperties: [string, unknown][] = [];

  constructor() {
    super('selectionwindow');
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
   * @returns The WindowFeature at the currently focused index.
   */
  getWindowFeature(): WindowFeature {
    return this.windowFeatures[this.focusedIndex] ?? null;
  }

  /**
   * Closes the window and deselect the selected features.
   */
  closeWindow() {
    this.state.interface.selectionComponentVisible = false;
    this.state.selection.focusedFeatures = null;
    this.state.selection.selectedFeatures = [];
  }

  /**
   * Sets the focus on a specific feature.
   */
  onFocusWindowFeature(index: number) {
    const windowFeature = this.selectedWindowFeature(index);
    this.state.selection.focusedFeatures = [windowFeature.feature];
    // Get content.
    this.displayedProperties = Object.entries(windowFeature.notOlProperties).filter((keyValue) => {
      return keyValue[1] !== undefined;
    });
    // Render and translate data.
    this.render();
    super.girafeTranslate();
  }

  /**
   * Renders the component by calling the necessary methods.
   * @private
   */
  private renderComponent() {
    super.render();
    super.girafeTranslate();
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
    this.makeDraggable();
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
   * Sets the selected features in the window and updates the window state to display the first feature.
   * @private
   */
  private onFeaturesSelected(features: OlFeature[] | null) {
    if (!features?.length) {
      this.closeWindow();
      return;
    }
    this.windowFeatures = SelectionWindowComponent.createWindowFeatures(
      this.featureToGridData.toGridDataById(features ?? [])
    );
    this.maxIndex = this.windowFeatures.length - 1;
    this.onFocusWindowFeature(0);
  }

  /**
   * Selects a window feature by its first valid index.
   * Out of bound index loops back to the first valid index.
   * @returns The selected window feature.
   * @private
   */
  private selectedWindowFeature(index: number): WindowFeature {
    this.focusedIndex = getValidIndex(index, this.maxIndex);
    return this.getWindowFeature();
  }

  /**
   * Toggles the panel visibility. If visible, tries to display a grid with selected feature.
   * Can only be visible if the component is the wanted selection component.
   * @private
   */
  private togglePanel(visible: boolean) {
    if (this.state.interface.selectionComponent !== 'window') {
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

  /**
   * Creates an array of WindowFeature objects based on the provided GridDataById object.
   * Using gridDataById orders by feature id the WindowFeatures.
   * @returns An array of WindowFeature objects.
   * @static
   */
  static createWindowFeatures(gridDataById: GridDataById): WindowFeature[] {
    const windowFeatures: WindowFeature[] = [];
    Object.keys(gridDataById).forEach((id) => {
      const gridData = gridDataById[id];
      gridData.features.forEach((feature, index) => {
        windowFeatures.push({
          id,
          feature,
          notOlProperties: gridData.notOlProperties[index]
        });
      });
    });
    return windowFeatures;
  }
}

export default SelectionWindowComponent;
