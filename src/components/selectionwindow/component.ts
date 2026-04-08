// SPDX-License-Identifier: Apache-2.0
import type OlFeature from 'ol/Feature';
import { getCenter } from 'ol/extent';
import GirafeDraggableElement from '../../base/GirafeDraggableElement';
import { debounce } from '../../tools/utils/debounce';
import type { Callback } from '../../tools/state/statemanager';
import type { GridDataById } from '../../tools/featuretogriddatabyid';
import FeatureToGridDataById from '../../tools/featuretogriddatabyid';
import { getValidIndex, linkify } from '../../tools/utils/utils';
import IconCenter from './images/center.svg';
import ResizeWindow from '../../tools/resizewindow';
import DOMPurify from 'dompurify';
import CsvManager from '../../tools/export/csvmanager';
import ColumnAliasHelper from '../../tools/utils/aliases';

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
  styleUrls = ['../../styles/common.css', '../../styles/resizable.css', '../../styles/window.css', './style.css'];

  private readonly eventsCallbacks: Callback[] = [];
  private isVisibleComponentSetup = false;
  private readonly debounceOnFeaturesSelected = debounce(this.onFeaturesSelected.bind(this), 200);
  private resizeWindow: ResizeWindow | null = null;
  private readonly featureToGridData = new FeatureToGridDataById({ removeEmptyColumns: false });
  private windowFeatures: WindowFeature[] = [];
  private windowLayers: string[] = [];
  visible = false;
  focusedIndex = 0;
  maxIndex = 0;
  iconCenter = IconCenter;
  private csvManager!: CsvManager;
  displayedProperties: [string, unknown][] = [];
  showDropdown = false;
  private columnAliasHelper!: ColumnAliasHelper;

  public constructor() {
    super('selectionwindow');
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.csvManager = new CsvManager(this.context);
    this.columnAliasHelper = new ColumnAliasHelper(this.context.stateManager);
    this.render();
    this.registerVisibilityEvents();
  }

  /**
   * Render the component regarding its visibility.
   */
  override render() {
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
    if (this.windowLayers.length == 1) {
      this.generateCSV(this.windowLayers[0]);
    } else {
      this.showDropdown = !this.showDropdown;
      this.render();
    }
  }

  /**
   * Gets the list of layers to export.
   * @returns The list of layers to export.
   */
  getLayersList() {
    return this.windowLayers.map(
      (layer) =>
        ({
          id: layer,
          label: `Export ${layer}`
        }) as Layer
    );
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

    this.csvManager.startDownload(data, columns, `${layer.replace(' ', '-')}.csv`);

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
  protected override closeWindow() {
    this.visible = false;
    this.state.interface.selectionComponentVisible = false; // Will render it again.
    this.state.selection.focusedFeatures = null;
    this.state.selection.selectedFeatures = [];
  }

  onFocusWindowFeatureChecked(event: Event) {
    const target = event.target! as HTMLInputElement;
    const newFocusIndex = Number.parseInt(target.value);
    if (newFocusIndex <= this.maxIndex + 1 && newFocusIndex >= 1) {
      this.onFocusWindowFeature(newFocusIndex - 1);
    } else if (newFocusIndex < 1) {
      target.value = '0';
    } else {
      target.value = (this.maxIndex + 1).toString();
    }
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
      if (this.context.configManager.Config.query.legacy) {
        config = {
          ADD_ATTR: ['onclick'],
          ADD_URI_SAFE_ATTR: ['onclick']
        };
      }

      keyValue[0] = this.context.i18nManager.getTranslation(
        this.columnAliasHelper.getColumnAlias(windowFeature.id, keyValue[0])
      );
      keyValue[1] = linkify(keyValue[1] as string);
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
    this.windowLayers = this.windowFeatures
      .map((feature) => feature.id)
      .filter((id, index, self) => self.indexOf(id) === index);
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
