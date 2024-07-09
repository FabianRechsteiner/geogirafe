import type OlFeature from 'ol/Feature';
import { deleteFeatureOlParams } from './utils/olutils';

/**
 * Represents a grid data organized by unique ids.
 */
export type GridDataById = Record<string, GridData>;

/**
 * Represents the data structure for a grid, based on multiple features
 * for a same ID (and with a same structure, geom type and properties).
 *  - Columns are every (not ol) features properties name;
 *  - Data are every (not ol) features properties values;
 *  - Features are every Ol features (backref);
 *  - notOlProperties are every property but without ol specific one.
 */
export interface GridData {
  columns: string[];
  data: unknown[][];
  features: OlFeature[];
  notOlProperties: Record<string, unknown>[];
}

/**
 * Options for converting feature data to grid data.
 */
export interface FeatureToGridDataOptions {
  /** Determines whether to keep the geometry property as a property value. */
  keepGeomProperty?: boolean;
  /** Determines whether to keep (always) empty columns or not in columns and data. */
  removeEmptyColumns?: boolean;
}

/**
 * A feature-to-grid data converter, to show feature's properties in grid-like system.
 */
export default class FeatureToGridDataById {
  options: FeatureToGridDataOptions;

  constructor(options: FeatureToGridDataOptions) {
    this.options = {
      ...{
        keepGeomProperty: false,
        removeEmptyColumns: true
      },
      ...options
    };
  }

  /**
   * Takes an array of OpenLayers features and converts them into a grid data object, where each feature
   * is mapped by its ID as the key.
   * @returns The grid data objects, by id.
   */
  toGridDataById(features: OlFeature[]): GridDataById {
    const gridDataById: GridDataById = features.reduce(
      (gridDataById, feature) => this.addFeatureToGridDataById(gridDataById, feature),
      {} as GridDataById
    );
    if (this.options.removeEmptyColumns) {
      Object.values(gridDataById).forEach((gridData) => FeatureToGridDataById.removeEmptyColumns(gridData));
    }
    return gridDataById;
  }

  /**
   * @returns a gridDataByID for a single converted OL feature.
   * @private
   */
  private addFeatureToGridDataById(gridDataById: GridDataById, feature: OlFeature): GridDataById {
    const featureId = FeatureToGridDataById.getUserFeatureId(feature);
    const notOlProperties = deleteFeatureOlParams(feature, this.options.keepGeomProperty);
    if (!Object.keys(notOlProperties).length) {
      // Don't keep feature without properties.
      return gridDataById;
    }
    if (!Object.keys(gridDataById).includes(featureId)) {
      gridDataById[featureId] = FeatureToGridDataById.createGridDataWithColumns(notOlProperties);
    }
    const gridData = gridDataById[featureId];

    // Add feature and not OL properties backref
    gridData.features.push(feature);
    gridData.notOlProperties.push(notOlProperties);

    // Add cell content.
    const data: unknown[] = gridData.columns.map((column) => notOlProperties[column]);
    gridData.data.push(data);
    return gridDataById;
  }

  /**
   * @returns {GridData} A new empty grid data object with columns from given properties.
   * @static
   */
  static createGridDataWithColumns(properties: Record<string, unknown>): GridData {
    return {
      columns: Object.keys(properties),
      notOlProperties: [],
      data: [],
      features: []
    };
  }

  /**
   * Removes empty columns (columns and data) from a given gridData object.
   * It's expected that all features in the gridData have the same properties.
   * @static
   */
  static removeEmptyColumns(gridData: GridData) {
    const emptyColumnIndexes = FeatureToGridDataById.findEmptyColumnIndexOf(gridData.data);
    gridData.columns = gridData.columns.filter((_column, index) => !emptyColumnIndexes.includes(index));
    gridData.data.forEach((_, index) => {
      gridData.data[index] = gridData.data[index].filter((_val, index) => !emptyColumnIndexes.includes(index));
    });
  }

  /**
   * This method finds the indexes of empty columns in a given 2D array.
   * @param data - The 2D array to search for empty columns.
   * @returns An array of indexes representing the empty columns.
   * @static
   */
  static findEmptyColumnIndexOf(data: unknown[][]): number[] {
    if (!data[0]) {
      return [];
    }
    const emptyColumnIndexes = Array.from({ length: data[0].length }, (_, index) => index);
    data.forEach((column) => {
      const notEmptyColumnIndexes: number[] = [];
      emptyColumnIndexes.forEach((emptyIndex) => {
        if (column[emptyIndex]) {
          notEmptyColumnIndexes.push(emptyIndex);
        }
      });
      notEmptyColumnIndexes.forEach((indexToRemove) => {
        const idx = emptyColumnIndexes.findIndex((emptyColumnIndex) => emptyColumnIndex === indexToRemove);
        emptyColumnIndexes.splice(idx, 1);
      });
    });
    return emptyColumnIndexes;
  }

  /**
   * @return The ID of the feature or 'UNKNOWN' if undefined.
   * @static
   */
  static getUserFeatureId(feature: OlFeature): string {
    const id = feature.getId();
    return id === undefined ? 'UNKNOWN' : `${id}`;
  }
}
