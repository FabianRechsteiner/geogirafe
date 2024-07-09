import type OlFeature from 'ol/Feature';
import I18nManager from '../../../tools/i18n/i18nmanager';
import FeatureToGridDataById, { GridData } from '../../../tools/featuretogriddatabyid';
import OlGeomGeometry from 'ol/geom/Geometry';
import { html, Grid } from 'gridjs';
import FormatGridGeomValue from './formatgridgeomvalue';
import ConfigManager from '../../../tools/configuration/configmanager';

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
  formatter: (cell: string, row: string, col: string) => void;
}

/**
 * Represents the content and backrefs of a tab.
 */
export interface TabContent {
  columns: Column[];
  data: unknown[][];
  features: OlFeature[];
}

/**
 * Manages the creation of a GridJS grid to display features properties grouped by feature id.
 */
export default class SelectionGridManager {
  private readonly formatGridGeomValue = new FormatGridGeomValue();
  private readonly featureToGridData = new FeatureToGridDataById({ keepGeomProperty: true });
  private configManager: ConfigManager;
  tabHeaders: TabHeader[] = [];
  idTab: Record<string, TabContent> = {};
  gridElement: HTMLElement | null = null;

  constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  /**
   * Sets the HTML element to display the grid in.
   */
  setGridElement(gridElement: HTMLElement | null) {
    this.gridElement = gridElement;
  }

  /**
   * Activates a tab matching the given id.
   */
  activateTab(id: string) {
    this.tabHeaders?.forEach((tabHeader) => (tabHeader.active = false));
    const visibleTabHeader = this.tabHeaders?.find((tabHeader) => tabHeader.id === id);
    if (!visibleTabHeader) {
      return;
    }
    visibleTabHeader.active = true;
  }

  /**
   * Creates (replace) the GridJS grid based on the provided tab id and related data and features.
   */
  displayGrid(id: string) {
    if (!this.gridElement) {
      return;
    }
    const tabContent = this.idTab[id];
    this.emptyGrid();
    new Grid({
      columns: tabContent.columns,
      sort: true,
      fixedHeader: true,
      data: tabContent.data,
      resizable: true,
      //search: {
      //  selector: this.searchGrid.bind(this)
      //},
      style: {
        th: {
          padding: '6px 10px'
        },
        td: {
          padding: '6px 10px'
        }
      }
    })
      .render(this.gridElement)
      .forceRender();
  }
  /**
   * Transforms the given features into grid data and sets tab headers.
   * The grid data are completely replaced.
   */
  featuresToGridData(features: OlFeature[]) {
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
  }

  /**
   * Clears the grid by emptying its HTML contents.
   */
  emptyGrid() {
    if (this.gridElement) {
      this.gridElement.innerHTML = '';
    }
  }

  /**
   * Converts grid data to grid tab format and adds it to the idTab object.
   * @private
   */
  private gridDataToGridTab(id: string, gridData: GridData) {
    if (id in this.idTab) {
      // Already in ? Don't add a new one.
      return;
    }
    this.idTab[id] = {
      columns: gridData.columns.map((column) => this.createGridColumn(column)),
      data: gridData.data.map((data) => this.createGridData(data)),
      features: gridData.features
    };
  }

  /**
   * @returns A newly created grid column object.
   * @private
   */
  private createGridColumn(id: string): Column {
    return {
      id,
      name: I18nManager.getInstance().getTranslation(id),
      formatter: SelectionGridManager.formatCell
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

  // private searchGrid(cell: string, rowIndex: string, cellIndex: string) {
  //   console.log('SEARCH', cell, rowIndex, cellIndex);
  // }

  /**
   * @returns The locale specified in the configuration.
   * @private
   */
  private getLocale(): string {
    return this.configManager.Config.general.locale;
  }

  /**
   * Formats a cell value by interpreting html tags if necessary.
   * @returns The formatted cell value as string or VNode (preact).
   * @static
   */
  static formatCell(cell: string, _row: unknown, _column: unknown): unknown {
    if (!cell) {
      return cell;
    }
    const lowerCell = cell.toLowerCase();
    if (
      (lowerCell.includes('<a') && lowerCell.includes('href')) ||
      (lowerCell.includes('<img') && lowerCell.includes('src')) ||
      lowerCell.includes('<button') ||
      lowerCell.includes('<table') ||
      (lowerCell.includes('<i') && lowerCell.includes('class'))
    ) {
      // For links and images, interpret html
      return html(cell);
    }
    return cell;
  }
}
