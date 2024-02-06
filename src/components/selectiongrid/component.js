import GirafeResizableElement from '../../base/GirafeResizableElement';
import { Grid, html } from 'gridjs';
import I18nManager from '../../tools/i18nmanager';
import { niceCoordinates } from '../../tools/geometrytools';
import Geometry from 'ol/geom/Geometry.js';
import { getCenter } from 'ol/extent';
import { LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon } from 'ol/geom';
class SelectionGridComponent extends GirafeResizableElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  locale = null;

  panel = null;
  content = null;
  header = null;
  grid = null;

  activeTab = null;

  typeToFeatures = {};

  constructor() {
    super('selectiongrid');
  }

  render() {
    super.render();

    // Bar is hidden per default
    this.panel = this.shadow.querySelector('#panel');
    this.content = this.shadow.querySelector('#content');
    this.header = this.shadow.querySelector('#header');
    this.grid = this.shadow.querySelector('#grid');
    this.panel.style.display = 'none';

    this.locale = this.configManager.Config.general.locale;

    this.activateTooltips(false, [800, 0], 'top-end');
  }

  registerEvents() {
    this.stateManager.subscribe('selection.selectedFeatures', (oldFeatures, newFeatures) =>
      this.onFeaturesSelected(newFeatures)
    );
    this.stateManager.subscribe('interface.selectionGridVisible', (oldValue, newValue) => this.togglePanel(newValue));
  }

  onFeaturesSelected(features) {
    this.header.innerHTML = '';
    if (this.isNullOrUndefined(features) || features.length <= 0) {
      this.state.interface.selectionGridVisible = false;
      this.grid.innerHTML = '';
      return;
    } else {
      this.state.interface.selectionGridVisible = false;
    }

    this.typeToFeatures = {};
    for (const f of features) {
      const id = f.getId();
      const featureType = id === undefined ? 'UNKNOWN' : id.split('.')[0];
      if (!(featureType in this.typeToFeatures)) {
        // Get columns
        const columns = [];
        for (const key in f.getProperties()) {
          // Exclude openlayers properties and geometry
          // TODO REG: Find the right geometry property using WFS Capabilities
          if (key !== 'boundedBy') {
            const column = {
              id: key,
              name: I18nManager.getInstance().getTranslation(key),
              formatter: this.formatCell.bind(this)
            };
            columns.push(column);
          }
        }

        // This feature type is not known yet
        this.typeToFeatures[featureType] = {
          columns: columns,
          data: [],
          features: []
        };
      }

      this.typeToFeatures[featureType].features.push(f);
      const data = [];
      // Content
      const properties = f.getProperties();
      for (const col of this.typeToFeatures[featureType].columns) {
        const value = properties[col.id];
        if (value instanceof Geometry) {
          const icons = this.getGeometryIcons(value);
          data.push(icons);
        } else {
          data.push(value);
        }
      }

      this.typeToFeatures[featureType].data.push(data);
    }

    for (const [key, value] of Object.entries(this.typeToFeatures)) {
      const tab = document.createElement('a');
      tab.text = I18nManager.getInstance().getTranslation(key);
      tab.className = 'tab';
      tab.id = key;
      tab.onclick = () => {
        this.displayGrid(key);
      };
      this.header.append(tab);
    }

    // Activate the first tab
    this.displayGrid(Object.keys(this.typeToFeatures)[0]);
  }

  getGeometryIcons(geometry) {
    let icons;
    let coords;
    if (geometry instanceof Point) {
      icons = '<i class="geo-type fg-point fg-lg"></i>';
      coords = geometry.getFlatCoordinates();
      const niceCoords = niceCoordinates(coords);
      icons += `<span>E ${niceCoords[0]} / N ${niceCoords[1]}</span>`;
    } else if (geometry instanceof MultiPoint) {
      icons = '<i class="geo-type fg-multipoint fg-lg"></i>';
      if (geometry.getPoints.length === 1) {
        coords = geometry.getPoint(0).getFlatCoordinates();
        const niceCoords = niceCoordinates(coords);
        icons += `<span>E ${niceCoords[0]} / N ${niceCoords[1]}</span>`;
      } else {
        coords = getCenter(geometry.getExtent());
        icons += `<span>Multipoint</span>`;
      }
    } else if (geometry instanceof LineString || geometry instanceof MultiLineString) {
      icons = '<i class="geo-type fg-polyline-pt fg-lg"></i>';
      const length = (Math.round(geometry.getLength() * 100) / 100).toLocaleString(this.locale, {
        minimumFractionDigits: 2
      });
      icons += `<span>${length}&nbsp;m</span>`;
      coords = getCenter(geometry.getExtent());
    } else if (geometry instanceof Polygon || geometry instanceof MultiPolygon) {
      icons = '<i class="geo-type fg-polygon-pt fg-lg"></i>';
      const area = (Math.round(geometry.getArea() * 100) / 100).toLocaleString(this.locale, {
        minimumFractionDigits: 2
      });
      icons += `<span>${area}&nbsp;m<sup>2</sup></span>`;
      coords = getCenter(geometry.getExtent());
    } else {
      console.error('Unknown geometry type', geometry.getType());
      return;
    }

    icons += `<girafe-button icon-style="fa-sm fa-solid fa-magnifying-glass" 
                             size="extra-small" tip="Pan to geometry" tip-placement="right" 
                             class="transparent" 
                             state-action="position.center" 
                             data-value="[${coords[0]},${coords[1]}]"></girafe-button>`;

    return icons;
  }

  formatCell(cell, row, column) {
    if (!this.isNullOrUndefinedOrBlank(cell)) {
      const lowerCell = cell.toLowerCase();
      if (
        (lowerCell.includes('<a') && lowerCell.includes('href')) ||
        (lowerCell.includes('<img') && lowerCell.includes('src')) ||
        lowerCell.includes('<girafe-button') ||
        lowerCell.includes('<table') ||
        (lowerCell.includes('<i') && lowerCell.includes('class'))
      ) {
        // For links and images, interpret html
        return html(cell);
      }
    }

    return cell;
  }

  searchGrid(cell, rowIndex, cellIndex) {
    console.log('SEARCH');
  }

  displayGrid(key) {
    this.grid.innerHTML = '';
    const features = this.typeToFeatures[key];

    new Grid({
      columns: features.columns,
      sort: true,
      fixedHeader: true,
      data: features.data,
      resizable: true,
      /*search: {
        selector: (cell, rowIndex, cellIndex) => { console.log('toto'); return cell;}
        //this.searchGrid.bind(this)
      },*/
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

    this.activateTooltips(false, [800, 0], 'top-end');

    // Set style on tab
    const tab = this.shadow.getElementById(key);
    tab.classList.add('active');
    if (this.activeTab !== null) {
      this.activeTab.classList.remove('active');
    }
    this.activeTab = tab;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }

  closePanel() {
    this.state.interface.selectionGridVisible = false;
    this.state.selection.selectedFeatures = null;
  }

  togglePanel(visible) {
    if (visible) {
      this.panel.style.display = 'block';
      this.panel.getRootNode().host.style.display = 'block';
    } else {
      this.panel.style.display = 'none';
      this.panel.getRootNode().host.style.display = 'none';
    }
  }
}

export default SelectionGridComponent;
