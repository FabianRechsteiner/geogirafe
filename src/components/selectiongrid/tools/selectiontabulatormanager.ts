import type OlFeature from 'ol/Feature';
import OlGeomGeometry from 'ol/geom/Geometry';
import ConfigManager from '../../../tools/configuration/configmanager';
import FeatureToGridDataById, { GridData, GridDataById } from '../../../tools/featuretogriddatabyid';
import I18nManager from '../../../tools/i18n/i18nmanager';
import FormatGridGeomValue from './formatgridgeomvalue';
import { ColumnDefinition, TabulatorFull as Tabulator } from 'tabulator-tables';
import StateManager from '../../../tools/state/statemanager';
import { getUid } from 'ol/util';
import { getColumnAlias } from '../../../tools/utils/aliases';

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

export default class SelectionTabulatorManager {
  private readonly formatGridGeomValue = new FormatGridGeomValue();
  private readonly configManager: ConfigManager;
  private readonly featureToGridData = new FeatureToGridDataById({ keepGeomProperty: true });
  private readonly stateManager: StateManager;
  idTab: Record<string, TabContent> = {};
  tabHeaders: TabHeader[] = [];
  table: Tabulator | null = null;
  element: string | HTMLElement = '';
  data: GridDataById = {};

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();
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
    this.tabHeaders?.forEach((tabHeader) => (tabHeader.active = false));
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
            return '<img alt="sort-up-icon" src="icons/sort-up.svg" />';
          case 'desc':
            return '<img alt="sort-down-icon" src="icons/sort-down.svg" />';
          default:
            return '<img alt="sort-icon" src="icons/sort.svg" />';
        }
      }
    });

    this.table?.on('rowSelectionChanged', (selection) => {
      // True if at least one row is selected.
      this.stateManager.state.selection.gridSelected = selection.length > 0;

      // Create a Map of features by their UIDs
      const featureMap = new Map<string, OlFeature<OlGeomGeometry>>();
      this.data[id].features.forEach((feature) => {
        const uid = getUid(feature.getGeometry());
        featureMap.set(uid, feature);
      });

      // Highlight selected features on the map.
      const highlightedGeometries = selection
        .map((row) => featureMap.get(getUid(row.geom ?? row.the_geom ?? row.geometry)))
        .filter((feature): feature is OlFeature => feature !== undefined);

      this.stateManager.state.selection.highlightedFeatures = highlightedGeometries;
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
    Object.keys(gridDataById).forEach((id) => this.gridDataToGridTab(id, gridDataById[id]));

    // Create tabs headers
    this.tabHeaders = Object.keys(this.idTab).map((key) => {
      return {
        id: key,
        text: I18nManager.getInstance().getTranslation(key),
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
      data: gridData.data.map((data) => this.createGridData(data)),
      features: gridData.features
    };
  }

  columnsToGridColumns(idTable: string, columns: string[]): ColumnDefinition[] {
    const columnDefinition: ColumnDefinition[] = [];
    columns.forEach((column) => {
      const columnAlias = getColumnAlias(idTable, column);
      columnDefinition.push({
        title: I18nManager.getInstance().getTranslation(columnAlias),
        field: column,
        formatter: 'html'
      });
    });

    columnDefinition.forEach((column) => {
      if (column.field === 'the_geom' || column.field === 'geom' || column.field === 'geometry') {
        column.formatter = (cell) => {
          return this.formatGridGeomValue.getGeometryIcons(cell.getValue(), this.getLocale()) ?? cell.getValue();
        };
      }
    });

    return columnDefinition;
  }

  filterEmptyColumnsOnData(data: GridDataById): GridDataById {
    for (const [_, entry] of Object.entries(data)) {
      const columns = entry.columns;
      const notOlProperties = entry.notOlProperties;
      for (const [_, row] of Object.entries(notOlProperties)) {
        for (const [key, _] of Object.entries(row)) {
          if (!columns.some((column) => column === key)) {
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
    const columnAlias = getColumnAlias(idTable, idColumn);
    return {
      id: idColumn,
      name: I18nManager.getInstance().getTranslation(columnAlias)
    };
  }

  /**
   * Creates grid data by mapping values (simple values, or transformed values in case of HTML).
   * @returns The grid data array.
   * @private
   */
  private createGridData(values: unknown[]): unknown[] {
    return values.map((value) =>
      value instanceof OlGeomGeometry ? this.formatGridGeomValue.getGeometryIcons(value, this.getLocale()) : value
    );
  }

  /**
   * @returns The locale specified in the configuration.
   * @private
   */
  private getLocale(): string {
    return this.configManager.Config.general.locale;
  }

  blockRedraw(): void {
    this.table?.blockRedraw();
  }

  restoreRedraw(): void {
    this.table?.restoreRedraw();
  }
}
