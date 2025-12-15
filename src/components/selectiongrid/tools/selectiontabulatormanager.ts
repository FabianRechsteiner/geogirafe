import type OlFeature from 'ol/Feature';
import OlGeomGeometry from 'ol/geom/Geometry';
import FeatureToGridDataById, { GridData, GridDataById } from '../../../tools/featuretogriddatabyid';
import { ColumnDefinition, RowComponent, TabulatorFull as Tabulator } from 'tabulator-tables';
import { getUid } from 'ol/util';
import ColumnAliasHelper from '../../../tools/utils/aliases';
import IGirafeContext from '../../../tools/context/icontext';

/**
 * Represents the header text and state of a tab.
 */
export interface TabHeader {
  id: string;
  text: string;
  active: boolean;
}

/**
 * Represents a column in a data table.
 */
export interface Column {
  id: string;
  name: string;
}

/**
 * Represents the content and backrefs of a tab.
 */
export interface TabContent {
  columns: Column[];
  data: unknown[][];
  features: OlFeature[];
}

const geometryColumns = new Set<string>(['geom', 'the_geom', 'geometry']);

export default class SelectionTabulatorManager {
  private readonly featureToGridData: FeatureToGridDataById;
  private idTab: Record<string, TabContent> = {};
  private tabHeaders: TabHeader[] = [];
  private table: Tabulator | null = null;
  private element: string | HTMLElement = '';
  private data: GridDataById = {};
  private readonly context: IGirafeContext;
  private readonly columnAliasHelper: ColumnAliasHelper;

  public constructor(context: IGirafeContext) {
    this.context = context;
    this.columnAliasHelper = new ColumnAliasHelper(context.stateManager);
    this.featureToGridData = new FeatureToGridDataById({ keepGeomProperty: true });
  }

  /**
   * Set the HTML element to be used by the grid.
   */
  setElement(htmlElement: HTMLElement): void {
    this.element = htmlElement;
  }

  /**
   * Replace the data of the current grid with the data of the specified tab.
   */
  replaceData(id: string): void {
    const columns = this.columnsToGridColumns(id, this.data[id].columns);
    this.table?.setColumns(columns);
    this.table?.replaceData(this.data[id].notOlProperties);
  }

  /**
   * Activates a tab matching the given id.
   */
  activateTab(id: string): void {
    for (const tabHeader of this.tabHeaders) {
      tabHeader.active = false;
    }
    const visibleTabHeader = this.tabHeaders?.find((tabHeader) => tabHeader.id === id);
    if (!visibleTabHeader) {
      return;
    }
    visibleTabHeader.active = true;
  }

  /**
   * Creates (replace) the Tabulator grid based on the provided tab id and related data and features.
   */
  displayGrid(id: string): void {
    if (!this.element) {
      return;
    }

    this.table = new Tabulator(this.element, {
      data: this.data[id].notOlProperties,
      columns: this.columnsToGridColumns(id, this.data[id].columns),
      selectableRows: true,
      layout: 'fitColumns',
      locale: true,
      maxHeight: '750',
      headerSortElement: function (_, dir) {
        switch (dir) {
          case 'asc':
            return '<img alt="sort-up-icon" src="icons/sort-up.svg" class="sort-icon" />';
          case 'desc':
            return '<img alt="sort-down-icon" src="icons/sort-down.svg" class="sort-icon" />';
          default:
            return '<img alt="sort-icon" src="icons/sort.svg" class="sort-icon default" />';
        }
      }
    });

    this.table?.on('rowSelectionChanged', (selection) => {
      // True if at least one row is selected.
      this.context.stateManager.state.selection.gridSelected = selection.length > 0;

      // Create a Map of features by their UIDs
      const featureMap = new Map<string, OlFeature<OlGeomGeometry>>();
      for (const feature of this.data[id].features) {
        featureMap.set(getUid(feature.getGeometry()), feature);
      }

      // Highlight selected features on the map.
      this.context.stateManager.state.selection.highlightedFeatures = selection
        .map((row) => featureMap.get(getUid(row.geom ?? row.the_geom ?? row.geometry)))
        .filter((feature): feature is OlFeature => feature !== undefined);
    });
  }

  /**
   * Transforms the given features into grid data and sets tab headers.
   * The grid data are completely replaced.
   */
  featuresToGridData(features: OlFeature[]): void {
    this.idTab = {};
    const gridDataById = this.featureToGridData.toGridDataById(features);

    // Create tabs and collect data.
    for (const id of Object.keys(gridDataById)) {
      this.gridDataToGridTab(id, gridDataById[id]);
    }

    // Create tabs headers
    this.tabHeaders = Object.keys(this.idTab).map((key) => {
      return {
        id: key,
        text: this.context.i18nManager.getTranslation(key),
        active: false
      };
    });

    this.data = this.filterEmptyColumnsOnData(gridDataById);
  }

  /**
   * Converts grid data to grid tab format and adds it to the idTab object.
   * @private
   */
  private gridDataToGridTab(id: string, gridData: GridData): void {
    if (id in this.idTab) {
      // Already in ? Don't add a new one.
      return;
    }
    this.idTab[id] = {
      columns: gridData.columns.map((column) => this.createGridColumn(id, column)),
      data: gridData.data,
      features: gridData.features
    };
  }

  columnsToGridColumns(idTable: string, columns: string[]): ColumnDefinition[] {
    const columnDefinition: ColumnDefinition[] = [];
    for (const column of columns) {
      if (geometryColumns.has(column)) {
        continue;
      }
      const columnAlias = this.columnAliasHelper.getColumnAlias(idTable, column);
      columnDefinition.push({
        title: this.context.i18nManager.getTranslation(columnAlias),
        field: column,
        formatter: 'html',
        sorter: 'string'
      });
    }

    return columnDefinition;
  }

  filterEmptyColumnsOnData(data: GridDataById): GridDataById {
    for (const [_, entry] of Object.entries(data)) {
      const columns = entry.columns;
      const notOlProperties = entry.notOlProperties;
      for (const [_, row] of Object.entries(notOlProperties)) {
        for (const [key, _] of Object.entries(row)) {
          if (!columns.includes(key)) {
            delete row[key];
          }
        }
      }
    }
    return data;
  }

  /**
   * @returns A newly created grid column object.
   * @private
   */
  private createGridColumn(idTable: string, idColumn: string): Column {
    const columnAlias = this.columnAliasHelper.getColumnAlias(idTable, idColumn);
    return {
      id: idColumn,
      name: this.context.i18nManager.getTranslation(columnAlias)
    };
  }

  blockRedraw(): void {
    this.table?.blockRedraw();
  }

  restoreRedraw(): void {
    this.table?.restoreRedraw();
  }

  selectAll(): void {
    this.table?.selectRow();
  }

  selectNone(): void {
    this.table?.deselectRow();
  }

  invertSelection(): void {
    for (const row of this.table!.getRows()) {
      row.toggleSelect();
    }
  }

  getSelectedRows(): RowComponent[] {
    return this.table?.getRows('selected') ?? [];
  }

  getSelectedData() {
    return this.table?.getSelectedData() ?? [];
  }

  getColumnFields(): string[] {
    return this.table?.getColumns(false).map((columnComponent) => columnComponent.getField()) ?? [];
  }

  getTabHeaders(): TabHeader[] {
    return this.tabHeaders;
  }

  clearTabHeaders(): void {
    this.tabHeaders = [];
  }

  getTabIds() {
    return Object.keys(this.idTab);
  }
}
