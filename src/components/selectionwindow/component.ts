import type OlFeature from 'ol/Feature';
import { getCenter } from 'ol/extent';
import GirafeDraggableElement from '../../base/GirafeDraggableElement';
import { debounce } from '../../tools/utils/debounce';
import type { Callback } from '../../tools/state/statemanager';
import type { GridDataById } from '../../tools/featuretogriddatabyid';
import FeatureToGridDataById from '../../tools/featuretogriddatabyid';
import { getValidIndex } from '../../tools/utils/utils';
import IconCenter from './images/center.svg';
import ResizeWindow from '../../tools/resizewindow';
import DOMPurify from 'dompurify';
import CsvManager from '../../tools/export/csvmanager';
import { getColumnAlias } from '../../tools/utils/aliases';
import I18nManager from '../../tools/i18n/i18nmanager';

/**
 * Represents a Feature displayed in the SelectionWindowComponent.
 */
interface WindowFeature {
  id: string;
  feature: OlFeature;
  notOlProperties: Record<string, unknown>;
}

interface Layer {
  id: string;
  label: string;
}

/**
 * Represents a draggable and resizable selection window component.
 * Display itself when it should be visible and have selected features.
 * To be visible, it has to be the defined selectionComponent.
 */
class SelectionWindowComponent extends GirafeDraggableElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', '../../styles/resizable.css', './style.css'];

  private readonly eventsCallbacks: Callback[] = [];
  private isVisibleComponentSetup = false;
  private readonly debounceOnFeaturesSelected = debounce(this.onFeaturesSelected.bind(this), 200);
  private resizeWindow: ResizeWindow | null = null;
  private readonly featureToGridData = new FeatureToGridDataById({ removeEmptyColumns: false });
  private windowFeatures: WindowFeature[] = [];
  visible = false;
  focusedIndex = 0;
  maxIndex = 0;
  iconCenter = IconCenter;
  csvManager = CsvManager.getInstance();
  displayedProperties: [string, unknown][] = [];
  showDropdown = false;

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
    if (this.visible) {
      this.renderComponent();
    } else {
      this.renderEmptyComponent();
    }
  }

  /**
   * @returns The WindowFeature at the currently focused index.
   */
  getWindowFeature(): WindowFeature {
    return this.windowFeatures[this.focusedIndex];
  }

  /**
   * Recenter the map view based on the current feature.
   */
  recenter() {
    const windowFeature = this.getWindowFeature();
    const extent = windowFeature?.feature?.getGeometry()?.getExtent();
    if (!extent) {
      console.error('Invalid feature to recenter on.');
      return;
    }
    this.state.position.center = getCenter(extent);
  }

  /**
   * Toggles the visibility of the layers dropdown.
   */
  openDropdown() {
    this.showDropdown = !this.showDropdown;
    this.render();
  }

  /**
   * Gets the list of layers to export.
   * @returns The list of layers to export.
   */
  getLayersList() {
    const layers: Layer[] = [];
    this.windowFeatures.forEach((feature) => {
      if (!layers.some((layer) => layer.id === feature.id)) {
        const label = `Export ${feature.id}`;
        layers.push({ id: feature.id, label });
      }
    });
    return layers;
  }

  /**
   * Generates a CSV file with the properties of the currently focused feature.
   * @param layer The layer to export.
   */
  generateCSV(layer: string) {
    // Only data from the selected layer
    const data: Record<string, unknown>[] = [];
    this.windowFeatures.forEach((feature) => {
      if (feature.id === layer) {
        data.push(feature.notOlProperties);
      }
    });

    // Ignore undefined values
    data.forEach((entry) => this.ignoreUndefinedValues(entry));

    // Get the columns
    const columns = Object.keys(data[0]).map((column) => {
      return { name: column };
    });

    this.csvManager.startDownload(data, columns, 'query-results.csv');

    this.showDropdown = false;
    this.render();
  }

  /**
   * Ignores undefined values in the data.
   */
  ignoreUndefinedValues(data: Record<string, unknown>) {
    Object.keys(data).forEach((key) => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });
  }

  /**
   * Closes the window and deselect the selected features.
   */
  closeWindow() {
    this.visible = false;
    this.state.interface.selectionComponentVisible = false; // Will render it again.
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
    this.displayedProperties.forEach((keyValue) => {
      let config = {};
      if (this.configManager.Config.query.legacy) {
        config = {
          ADD_ATTR: ['onclick'],
          ADD_URI_SAFE_ATTR: ['onclick']
        };
      }

      keyValue[0] = I18nManager.getInstance().getTranslation(getColumnAlias(windowFeature.id, keyValue[0]));
      keyValue[1] = DOMPurify.sanitize(keyValue[1] as string, config);
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
    if (!this.isVisibleComponentSetup) {
      this.setupVisibleComponent();
    }
    super.girafeTranslate();
  }

  /**
   * Sets up the components state and side-kicks.
   * This must be called once at the first (visible) rendering.
   * @private
   */
  private setupVisibleComponent() {
    this.isVisibleComponentSetup = true;
    this.resizeWindow = new ResizeWindow(this.shadow);
    this.makeDraggable();
    this.registerEvents();
  }

  /**
   * Render a placeholder, not visible component on hide.
   * Removes event registration.
   * @private
   */
  private renderEmptyComponent() {
    this.resizeWindow?.destroy();
    this.resizeWindow = null;
    this.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;
    this.isVisibleComponentSetup = false;
    this.renderEmpty();
  }

  /**
   * Event about visibility that must be always listened by this component, even hidden.
   * @private
   */
  private registerVisibilityEvents() {
    this.subscribe('interface.selectionComponentVisible', (_oldValue, newValue) => this.togglePanel(newValue));
  }

  /**
   * Listen events that must be listened if the component is visible.
   * @private
   */
  private registerEvents() {
    this.eventsCallbacks.push(
      this.subscribe('selection.selectedFeatures', (_oldFeatures, newFeatures) => {
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
    if (!this.windowFeatures.length) {
      this.closeWindow();
      return;
    }
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
