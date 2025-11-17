import GirafeResizableElement from '../../base/GirafeResizableElement';
import type { Callback } from '../../tools/state/statemanager';
import * as olExtent from 'ol/extent';
import type OlFeature from 'ol/Feature';
import { debounce } from '../../tools/utils/debounce';
import SelectionTabulatorManager, { type TabHeader } from './tools/selectiontabulatormanager';
import CsvManager from '../../tools/export/csvmanager';

/**
 * Represents a selection grid component based on GridJs.
 * Display itself when it should be visible and have selected features.
 * To be visible, it has to be the defined selectionComponent.
 * @extends GirafeResizableElement
 */
class SelectionGridComponent extends GirafeResizableElement {
  templateUrl = './template.html';

  styleUrls = [
    '../../styles/common.css',
    '../../../node_modules/tabulator-tables/dist/css/tabulator.min.css',
    './style.css'
  ];

  private readonly eventsCallbacks: Callback[] = [];
  private selectionTabulatorManager!: SelectionTabulatorManager;
  private csvManager!: CsvManager;
  private isVisibleComponentSetup = false;
  private readonly debounceOnFeaturesSelected = debounce(this.onFeaturesSelected.bind(this), 200);
  visible = false;
  currentTabId: string = '';
  resultsSelected = false;

  constructor() {
    super('selectiongrid');
  }

  connectedCallback() {
    super.connectedCallback();
    this.csvManager = new CsvManager(this.context);
    this.selectionTabulatorManager = new SelectionTabulatorManager(this.context);

    this.subscribe('selection.gridSelected', (_oldValue: boolean, newValue: boolean) => {
      this.resultsSelected = newValue;
      this.render();
    });

    this.addEventListener('resize-start', () => {
      this.selectionTabulatorManager.blockRedraw();
    });

    this.addEventListener('resize-end', () => {
      this.selectionTabulatorManager.restoreRedraw();
    });

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
   * @returns The current array of TabHeader objects.
   */
  getTabHeaders(): TabHeader[] {
    return this.selectionTabulatorManager.getTabHeaders();
  }

  /**
   * Activates the specified tab, renders the grid, and displays the grid for the specified id.
   */
  displayGrid(id: string, replaceData: boolean = false) {
    if (replaceData) {
      this.selectionTabulatorManager.replaceData(id);
    }

    this.selectionTabulatorManager.activateTab(id);
    this.render();
    this.selectionTabulatorManager.displayGrid(id);
    this.currentTabId = id;
  }

  /**
   * Clean the grid, closes the panel and deselect the selected features.
   */
  closePanel() {
    this.state.interface.selectionComponentVisible = false;
    this.state.selection.selectedFeatures = [];
    this.state.selection.highlightedFeatures = [];
    this.resultsSelected = false;
    this.state.selection.gridSelected = false;
    super.clean();
  }

  /**
   * Selects all rows in the grid.
   */
  selectAll() {
    this.selectionTabulatorManager.selectAll();
  }

  /**
   * Deselects all rows in the grid.
   */
  selectNone() {
    this.selectionTabulatorManager.selectNone();
  }

  /**
   * Inverts the selection of all rows in the grid.
   */
  invertSelection() {
    this.selectionTabulatorManager.invertSelection();
  }

  /**
   * Zooms to the extent of the selected rows in the grid.
   */
  zoomToSelection() {
    const extent = olExtent.createEmpty();
    for (const row of this.selectionTabulatorManager.getSelectedRows()) {
      const data = row.getData();
      const geometry = data.geom ?? data.the_geom ?? data.geometry;
      olExtent.extend(extent, geometry.getExtent());
    }
    this.context.mapManager.getMap().getView().fit(extent, { duration: 300 });
  }

  /**
   * Generates a CSV file from the selected rows in the grid.
   */
  generateCSV() {
    const columnDefs = this.selectionTabulatorManager.getNonGeometryColumnFields().map((column) => {
      return { name: column };
    });

    this.csvManager.startDownload(this.selectionTabulatorManager.getSelectedData(), columnDefs, 'query-results.csv');
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
    this.resultsSelected = false;
    this.state.selection.gridSelected = false;

    this.isVisibleComponentSetup = true;
    this.registerEvents();
  }

  /**
   * Render a placeholder, not visible component on hide.
   * Removes event registration.
   * @private
   */
  private renderEmptyComponent() {
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
        // Use debounce to avoid quickly closing the grid on selection change.
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
    this.selectionTabulatorManager.clearTabHeaders();
    // No feature ? Close.
    if (this.isNullOrUndefined(features) || features!.length <= 0) {
      this.closePanel();
      return;
    }

    this.selectionTabulatorManager.featuresToGridData(features!);
    const tabIds = this.selectionTabulatorManager.getTabIds();

    //define table element
    this.selectionTabulatorManager.setElement(this.shadow.querySelector('#tabulator') as HTMLElement);

    // No tab ? Close the panel.
    if (!tabIds.length) {
      this.closePanel();
    }
    // Otherwise, activate and display the first tab.
    this.displayGrid(tabIds[0]);
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
