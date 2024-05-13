import GirafeResizableElement from '../../base/GirafeResizableElement';
import { Grid, html } from 'gridjs';
import I18nManager from '../../tools/i18nmanager';
import { niceCoordinates } from '../../tools/geometrytools';
import { getCenter } from 'ol/extent';
import { LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon, Circle } from 'ol/geom';
import IconCenter from './images/center.svg';
import type { Callback } from '../../tools/state/statemanager';
import type OlFeature from 'ol/Feature';
import { deleteFeatureOlParams, polygonFromCircle } from '../../tools/olutils';
import OlGeomGeometry from 'ol/geom/Geometry';
import { debounce } from '../../tools/debounce';

interface TabHeader {
  id: string;
  text: string;
  active: boolean;
}

interface Column {
  id: string;
  name: string;
  formatter: (cell: string, row: string, col: string) => void;
}

interface TabContent {
  columns: Column[];
  data: unknown[][];
  features: OlFeature[];
}

/**
 * Represents a selection grid component based on GridJs.
 * Display itself when it should be visible and have selected features.
 * @extends GirafeResizableElement
 */
class SelectionGridComponent extends GirafeResizableElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  private readonly eventsCallbacks: Callback[] = [];
  private isVisibleComponentSetup = false;
  private debounceOnFeaturesSelected = debounce(this.onFeaturesSelected.bind(this), 200);
  visible = false;
  iconCenter = IconCenter;
  tabHeaders: TabHeader[] = [];
  grid: HTMLElement | null = null;
  idTab: Record<string, TabContent> = {};

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
   * Creates and displays the grid based on the provided tab key.
   * @param key - The key for retrieving the tab content.
   */
  displayGrid(key: string) {
    this.tabHeaders?.forEach((tabHeader) => (tabHeader.active = false));
    const visibleTabHeader = this.tabHeaders?.find((tabHeader) => tabHeader.id === key);
    if (!visibleTabHeader) {
      return;
    }
    visibleTabHeader.active = true;
    const tabContent = this.idTab[key];
    this.render();
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
      .render(this.grid)
      .forceRender();
  }

  /**
   * Closes the panel and deselect the selected features.
   */
  closePanel() {
    this.state.interface.selectionGridVisible = false;
    this.state.selection.selectedFeatures = [];
  }

  /**
   * Register to events on first call from a not-visible state.
   * @private
   */
  private renderComponent() {
    super.girafeTranslate();
    super.render();
    this.grid = this.shadow.querySelector('#grid');
    this.activateTooltips(false, [800, 0], 'top-end');
    if (!this.isVisibleComponentSetup) {
      this.setupVisibleComponent();
    }
  }

  /**
   * Register to events.
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
    this.stateManager.subscribe('interface.selectionGridVisible', (_oldValue, newValue) => this.togglePanel(newValue));
  }

  /**
   * Listen events that must be listened if the grid panel is visible.
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
  private onFeaturesSelected(features: OlFeature[]) {
    this.tabHeaders = [];
    // No feature ? Close.
    if (this.isNullOrUndefined(features) || features.length <= 0) {
      this.state.interface.selectionGridVisible = false;
      this.emptyGrid();
      return;
    }
    // Otherwise, transforms features to grid data.
    this.featuresToGridData(features);
  }

  /**
   * Transforms the given features into grid data and sets tab headers.
   * The grid data are completely replaced.
   * @private
   */
  private featuresToGridData(features: OlFeature[]) {
    this.idTab = {};

    // Create tabs and collect data.
    features.forEach((feature) => this.oneFeatureToGridData(feature));
    Object.values(this.idTab).forEach((tab) => this.removeEmptyColumns(tab));

    // Create tabs headers
    this.tabHeaders = Object.keys(this.idTab).map((key) => {
      return {
        id: key,
        text: I18nManager.getInstance().getTranslation(key),
        active: false
      };
    });

    // Activate the first tab
    this.displayGrid(Object.keys(this.idTab)[0]);
  }

  /**
   * Converts a single feature to grid data.
   * @private
   */
  private oneFeatureToGridData(feature: OlFeature) {
    const id = feature.getId();
    const featureId = id === undefined ? 'UNKNOWN' : `${id}`.split('.')[0];
    if (!(featureId in this.idTab)) {
      this.addEmptyEntryInTabs(feature, featureId);
    }

    // Add feature backref.
    this.idTab[featureId].features.push(feature);
    // Add cell content.
    const properties = deleteFeatureOlParams(feature, true);
    const featureData = this.idTab[featureId].columns.map((column) => {
      const value = properties[column.id];
      return value instanceof OlGeomGeometry ? this.getGeometryIcons(value) : value;
    });
    this.idTab[featureId].data.push(featureData);
  }

  /**
   * Adds an empty entry in the tabs. Meaning an entry without cell data, but already with columns.
   * @private
   */
  private addEmptyEntryInTabs(feature: OlFeature, id: string) {
    // Get columns.
    const properties = deleteFeatureOlParams(feature, true);
    const columns = Object.keys(properties).map((key) => {
      return {
        id: key,
        name: I18nManager.getInstance().getTranslation(key),
        formatter: this.formatCell.bind(this)
      };
    });
    // Add the new tab.
    this.idTab[id] = {
      columns: columns,
      data: [],
      features: []
    };
  }

  /**
   * Removes empty columns from a given TabContent object.
   * @return
   */
  private removeEmptyColumns(tab: TabContent) {
    const emptyColumnIndexes = this.findEmptyColumnIndexOf(tab.data);
    tab.columns = tab.columns.filter((_column, index) => !emptyColumnIndexes.includes(index));
    tab.data.forEach((_, index) => {
      tab.data[index] = tab.data[index].filter((_val, index) => !emptyColumnIndexes.includes(index));
    });
  }

  /**
   * This method finds the indexes of empty columns in a given 2D array.
   * @param data - The 2D array to search for empty columns.
   * @returns An array of indexes representing the empty columns.
   */
  private findEmptyColumnIndexOf(data: unknown[][]): number[] {
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
   * @returns The generated HTML string containing the icons, based on the provided geometry.
   * @private
   */
  private getGeometryIcons(geometry: OlGeomGeometry) {
    const info = this.getGeometryIconsInfo(geometry);
    if (!info[0]) {
      return;
    }
    let icons = info[0];
    const coords = info[1];

    icons += `<button class="girafe-button-tiny tiny-margin"
                      tip="Pan to geometry"
                      tip-placement="right"
                      onclick="document.geogirafe.state.position.center = [${coords[0]},${coords[1]}]">
                <img alt="menu-icon" src="${this.iconCenter}" />
              </button>`;

    return icons;
  }

  /**
   * Supports point, multipoint, line, multilines (as line),
   * polygon and multipolygons (as polygon) and circle (as polygon).
   * @return A tuple containing the icon html, based on the given geometry,
   * and coordinates array. Can returns [null, null] in case of not supported geometry.
   */
  private getGeometryIconsInfo(geometry: OlGeomGeometry): [string, number[]] | [null, null] {
    if (geometry instanceof Point) {
      return this.getGeometryIconsInfoPoint(geometry);
    }
    if (geometry instanceof MultiPoint) {
      return this.getGeometryIconsInfoMultiPoint(geometry);
    }
    if (geometry instanceof LineString || geometry instanceof MultiLineString) {
      return this.getGeometryIconsInfoLine(geometry);
    }
    if (geometry instanceof Polygon || geometry instanceof MultiPolygon) {
      return this.getGeometryIconsInfoPolygon(geometry);
    }
    if (geometry instanceof Circle) {
      return this.getGeometryIconsInfoPolygon(polygonFromCircle(geometry));
    }
    console.error('Unknown geometry type', geometry.getType());
    return [null, null];
  }

  /**
   * @returns An tuple containing the icons and coordinates for a point geometry.
   * @private
   */
  private getGeometryIconsInfoPoint(geometry: Point): [string, number[]] {
    let icons = '<i class="geo-type fg-point fg-lg"></i>';
    const coords = geometry.getFlatCoordinates();
    const niceCoords = niceCoordinates(coords, this.getLocale());
    icons += `<span>E ${niceCoords[0]} / N ${niceCoords[1]}</span>`;
    return [icons, coords];
  }

  /**
   * @returns An tuple containing the icons and coordinates for a multi point geometry.
   * @private
   */
  private getGeometryIconsInfoMultiPoint(geometry: MultiPoint): [string, number[]] {
    let icons = '<i class="geo-type fg-multipoint fg-lg"></i>';
    if (geometry.getPoints.length === 1) {
      const coords = geometry.getPoint(0).getFlatCoordinates();
      const niceCoords = niceCoordinates(coords, this.getLocale());
      icons += `<span>E ${niceCoords[0]} / N ${niceCoords[1]}</span>`;
      return [icons, coords];
    }
    const coords = getCenter(geometry.getExtent());
    icons += `<span>Multipoint</span>`;
    return [icons, coords];
  }

  /**
   * @returns An tuple containing the icons and coordinates for a line or multiline geometry.
   * @private
   */
  private getGeometryIconsInfoLine(geometry: LineString | MultiLineString): [string, number[]] {
    let icons = '<i class="geo-type fg-polyline-pt fg-lg"></i>';
    let geoLength;
    if (geometry instanceof MultiLineString) {
      geoLength = geometry.getLineStrings().reduce((length, line) => length + line.getLength(), 0);
    } else {
      geoLength = geometry.getLength();
    }
    const length = (Math.round(geoLength * 100) / 100).toLocaleString(this.configManager.Config.general.locale, {
      minimumFractionDigits: 2
    });
    icons += `<span>${length}&nbsp;m</span>`;
    const coords = getCenter(geometry.getExtent());
    return [icons, coords];
  }

  /**
   * @returns An tuple containing the icons and coordinates for a polygon or multipolygon geometry.
   * @private
   */
  private getGeometryIconsInfoPolygon(geometry: Polygon | MultiPolygon): [string, number[]] {
    let icons = '<i class="geo-type fg-polygon-pt fg-lg"></i>';
    const area = (Math.round(geometry.getArea() * 100) / 100).toLocaleString(this.configManager.Config.general.locale, {
      minimumFractionDigits: 2
    });
    icons += `<span>${area}&nbsp;m<sup>2</sup></span>`;
    const coords = getCenter(geometry.getExtent());
    return [icons, coords];
  }

  /**
   * Formats a cell value by interpreting html tags if necessary.
   * @return The formatted cell value.
   */
  private formatCell(cell: string, _row: unknown, _column: unknown) {
    if (this.isNullOrUndefinedOrBlank(cell)) {
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

  // private searchGrid(cell: string, rowIndex: string, cellIndex: string) {
  //   console.log('SEARCH', cell, rowIndex, cellIndex);
  // }

  /**
   * Clears the grid by emptying its contents.
   * @private
   */
  private emptyGrid() {
    if (this.grid) {
      this.grid.innerHTML = '';
    }
  }

  /**
   * Toggles the panel visibility. If visible, tries to display a grid with selected feature.
   * @private
   */
  private togglePanel(visible: boolean) {
    this.visible = visible;
    if (visible) {
      // Will be rendered after computing selected feature.
      this.onFeaturesSelected(this.state.selection.selectedFeatures);
    } else {
      this.render();
    }
  }

  private getLocale(): string {
    return this.configManager.Config.general.locale;
  }
}

export default SelectionGridComponent;
