import type { VectorFeatureFileFormat, ColorPalette, ColorVariable, PrintFileFormat } from './../crosssectiontypes';
import type { Marker, Measurement } from './../scatterplot';
import type { Callback } from '../../../tools/state/statemanager';

import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import { CrossSectionState } from './../crosssectionstate';
import { download } from '../../../tools/export/download';
import MapManager from '../../../tools/state/mapManager';
import I18nManager from '../../../tools/i18n/i18nmanager';
import Map from 'ol/Map';
import { Circle, Icon, Fill, Stroke, Style, Text } from 'ol/style.js';
import VectorSource, { VectorSourceEvent } from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Feature from 'ol/Feature';
import {
  Geometry,
  LinearRing,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
  SimpleGeometry,
  GeometryCollection
} from 'ol/geom';
import { Draw, Modify } from 'ol/interaction';
import { DrawEvent } from 'ol/interaction/Draw';
import { ModifyEvent } from 'ol/interaction/Modify';
import { KML, GeoJSON, GPX } from 'ol/format';
// @ts-expect-error: JSTS typing issue
import OL3Parser from 'jsts/org/locationtech/jts/io/OL3Parser.js';
// @ts-expect-error: JSTS typing issue
import { BufferOp, BufferParameters } from 'jsts/org/locationtech/jts/operation/buffer.js';
import { StyleLike } from 'ol/style/Style';

class CrossSectionSettingsComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../../../styles/common.css'];

  crossSectionState: CrossSectionState;
  i18nManager: I18nManager;
  private readonly eventsCallbacks: Callback[] = [];
  darkFrontendMode: boolean = false;
  visible: boolean = false;
  private readonly map: Map;
  linestring!: Feature<LineString>;
  linestringSource!: VectorSource<Feature<Geometry>>;
  linesLayer!: VectorLayer<VectorSource<Feature<Geometry>>>;
  domainLinestring!: Feature<LineString>;
  domainLinestringSource!: VectorSource<Feature<Geometry>>;
  domainLineStringLayer!: VectorLayer<VectorSource<Feature<Geometry>>>;
  polygon!: Feature<Polygon>;
  polygonSource!: VectorSource<Feature<Geometry>>;
  polygonLayer!: VectorLayer<VectorSource<Feature<Geometry>>>;
  pointer!: Feature<Point>;
  pointerSource!: VectorSource<Feature<Geometry>>;
  pointerLayer!: VectorLayer<VectorSource<Feature<Geometry>>>;
  points!: Feature<Point>[];
  pointsSource!: VectorSource<Feature<Geometry>>;
  pointsLayer!: VectorLayer<VectorSource<Feature<Geometry>>>;
  drawInteraction!: Draw;
  modifyInteraction!: Modify;
  linestringLength: number = 0.0;
  markersTable: HTMLTableElement | null = null; // reference to 'markers-table' shadow DOM element
  measurementsTable: HTMLTableElement | null = null; // reference to 'measurements-table' shadow DOM element

  parser = new OL3Parser();

  iconStyle: Style = new Style({
    image: new Icon({
      color: '#FF8C00',
      anchor: [0.5, 0.5],
      anchorXUnits: 'fraction',
      anchorYUnits: 'fraction',
      src: 'icons/adjust.svg'
    })
  });

  pointStyleFunction = (feature: Feature) => {
    return new Style({
      image: new Circle({
        radius: 7,
        fill: new Fill({ color: feature.get('show') ? [255, 255, 0, 0.75] : [0, 0, 0, 0.75] }),
        stroke: new Stroke({ color: feature.get('show') ? '#FF0000' : '#000000', width: 2 })
      }),
      text: new Text({
        text: `${feature.get('label')}`,
        font: '16px sans-serif',
        textAlign: 'center',
        justify: 'center',
        textBaseline: 'middle',
        placement: 'point',
        fill: new Fill({ color: [255, 255, 255, 1] }),
        offsetY: -30,
        backgroundFill: new Fill({ color: [0, 0, 0, 1] }),
        padding: [5, 7, 5, 7]
      })
    });
  };

  constructor() {
    super('cross-section-settings');
    this.state.extendedState.crossSection = new CrossSectionState();
    this.crossSectionState = this.state.extendedState.crossSection as CrossSectionState;
    this.i18nManager = I18nManager.getInstance();
    this.map = MapManager.getInstance().getMap();

    // Initialize JSTS parser
    this.parser.inject(
      Point,
      LineString,
      LinearRing,
      Polygon,
      MultiPoint,
      MultiLineString,
      MultiPolygon,
      GeometryCollection
    );

    this.initializeMapElements();
  }

  private initializeMapElements(): void {
    this.initializeLinestring();
    this.initializeDomainLinestring();
    this.initializePolygon();
    this.initializePointer();
    this.initializePointsLayer();
    this.initializeInteractions();
  }

  private initializeLinestring(): void {
    this.linestring = new Feature({
      id: 'cross-section-linestring',
      geometry: new LineString([])
    });

    this.linestringSource = new VectorSource();

    this.linestringSource.on('addfeature', (e: VectorSourceEvent) => {
      this.handleAddFeature(e);
    });

    this.linesLayer = new VectorLayer({
      source: this.linestringSource,
      style: {
        'fill-color': 'rgba(255, 255, 255, 0.2)',
        'stroke-color': '#ff0000',
        'stroke-width': 2
      },
      properties: {
        addToPrintedLayers: true,
        altitudeMode: 'clampToGround'
      }
    });

    this.map.addLayer(this.linesLayer);
  }

  private initializeDomainLinestring(): void {
    this.domainLinestring = new Feature({
      id: 'domainLinestring',
      geometry: new LineString([])
    });

    this.domainLinestringSource = new VectorSource<Feature<Geometry>>({ features: [] });

    this.domainLineStringLayer = new VectorLayer({
      source: this.domainLinestringSource,
      style: {
        'stroke-color': '#0000ff',
        'stroke-width': 2
      },
      properties: {
        addToPrintedLayers: true,
        altitudeMode: 'clampToGround'
      }
    });

    this.map.addLayer(this.domainLineStringLayer);
  }

  private initializePolygon(): void {
    this.polygon = new Feature({
      id: 'linestringBuffer',
      geometry: new Polygon([])
    });

    this.polygonSource = new VectorSource<Feature<Geometry>>({ features: [] });

    this.polygonLayer = new VectorLayer({
      source: this.polygonSource,
      style: {
        'fill-color': 'rgba(255, 255, 255, 0.2)',
        'stroke-color': '#ff0000',
        'stroke-width': 2
      },
      properties: {
        addToPrintedLayers: true,
        altitudeMode: 'clampToGround'
      }
    });

    this.map.addLayer(this.polygonLayer);
  }

  private initializePointer(): void {
    this.pointer = new Feature({
      geometry: new Point([]),
      style: this.iconStyle
    });

    this.pointerSource = new VectorSource<Feature<Geometry>>({
      features: [],
      wrapX: false
    });

    this.pointerLayer = new VectorLayer({
      source: this.pointerSource,
      style: this.iconStyle,
      properties: {
        addToPrintedLayers: true,
        altitudeMode: 'clampToGround'
      }
    });

    this.map.addLayer(this.pointerLayer);
  }

  private initializePointsLayer(): void {
    this.points = [];

    this.pointsSource = new VectorSource<Feature<Geometry>>({
      features: this.points,
      wrapX: false
    });

    this.pointsLayer = new VectorLayer({
      source: this.pointsSource,
      style: this.pointStyleFunction as StyleLike,
      properties: {
        addToPrintedLayers: true,
        altitudeMode: 'clampToGround'
      }
    });

    this.map.addLayer(this.pointsLayer);
  }

  private initializeInteractions(): void {
    this.initializeDrawInteraction();
    this.initializeModifyInteraction();
  }

  private handleAddFeature(e: VectorSourceEvent | DrawEvent): void {
    const geometry = e.feature?.getGeometry() as LineString;
    this.linestring.setGeometry(geometry);
    this.crossSectionState.linestringCoordinates = geometry.getCoordinates() as [number, number][];
  }

  private initializeDrawInteraction(): void {
    this.drawInteraction = new Draw({
      source: this.linestringSource,
      type: 'LineString',
      freehand: false
    });

    this.drawInteraction.on('drawstart', (_e: DrawEvent) => {
      this.deleteProfile();
    });

    // Listen to drawing end event (note: the DRAWEND event is dispatched before inserting the feature in the source)
    this.drawInteraction.on('drawend', (e: DrawEvent) => {
      this.handleAddFeature(e);
    });
  }

  private initializeModifyInteraction(): void {
    this.modifyInteraction = new Modify({ source: this.linestringSource });

    this.modifyInteraction.on('modifystart', (_e: ModifyEvent) => {
      this.polygonSource.clear();
      this.domainLinestringSource.clear();
      this.pointerSource.clear();
    });

    this.modifyInteraction.on('modifyend', (_e: ModifyEvent) => {
      // The linestring coordinates are only updated when the modify interaction has ended, to
      // avoid redrawing the buffer and domain linestring during modification
      this.crossSectionState.linestringCoordinates = this.linestring.getGeometry()!.getCoordinates() as [
        number,
        number
      ][];
    });
  }

  updateMarkers(polygon: Feature<Polygon>): void {
    if (!this.linestring) {
      console.warn('updateMarkers: The cross-section linestring is undefined, unable to update markers');
      return;
    }

    const linestringGeom = this.linestring.getGeometry() as LineString;

    this.points.forEach((el: Feature<Point>) => {
      const coord = el.getGeometry()?.getCoordinates();

      if (!coord) {
        console.warn('updateMarkers: Map point feature coordinate is undefined, unable to update markers');
        return;
      }

      // Check if the marker is inside the polygon (buffer around the linestring)
      const inside = polygon.getGeometry()?.intersectsCoordinate(coord) as boolean;
      const target = this.crossSectionState.markers.find((x) => x.id == el.get('id'));

      if (target) {
        target.show = inside;
        el.set('show', inside);

        if (inside) {
          // Get map coordinates of the closest point on the profile linestring
          const closestPoint = linestringGeom.getClosestPoint(coord) as [number, number];

          // Get linear coordinates of the closest point on the profile linestring and update marker scatterplot position in state manager
          target.x = this.getDistanceAtCoord(linestringGeom, closestPoint);
        }
      }
    });
  }

  drawLinestringBuffer(): void {
    if (this.crossSectionState.linestringCoordinates.length < 2) {
      return;
    }

    if (!this.linestring) {
      console.warn('updateLinestringBuffer: Linestring is undefined, unable to update buffer');
      return;
    }

    this.polygonSource.clear();
    const geometry = this.linestring.getGeometry();
    const jstsGeom = this.parser.read(geometry);
    const bufferParams = new BufferParameters(
      BufferParameters.DEFAULT_QUADRANT_SEGMENTS,
      BufferParameters.CAP_FLAT,
      BufferParameters.JOIN_MITRE,
      BufferParameters.DEFAULT_MITRE_LIMIT
    );

    const bo = new BufferOp(jstsGeom, bufferParams);
    const buffered = bo.getResultGeometry(this.crossSectionState.sectionWidthSettings.value);
    const mypoly = this.parser.write(buffered) as Polygon;
    this.polygon.setGeometry(mypoly);
    this.polygonSource.addFeature(this.polygon);

    this.updateMarkers(this.polygon);
  }

  updateLinestringCoordinates() {
    this.pointerSource.clear();
    this.domainLinestringSource.clear();
    this.polygonSource.clear();

    if (this.crossSectionState.linestringCoordinates.length >= 2) {
      this.linestring!.getGeometry()!.setCoordinates(this.crossSectionState.linestringCoordinates);
      this.linestringLength = this.linestring!.getGeometry()!.getLength();
      this.drawDomainLinestring();
      this.drawLinestringBuffer();
    } else {
      this.linestringSource.clear();
    }
  }

  drawDomainLinestring(): void {
    if (this.crossSectionState.linestringCoordinates.length < 2) {
      return;
    }

    const geometry = this.linestring.getGeometry();

    if (!geometry) {
      console.warn('drawDomainLinestring: Linestring geometry is undefined, unable to clip');
      return;
    }

    if (geometry.getCoordinates().length < 2) {
      return;
    }

    const linestringLength = geometry.getLength();

    // Get map coordinates of profile domain extent
    const fStart = Math.max(0.0, this.crossSectionState.domain.xmin / linestringLength);
    const fEnd = Math.min(1.0, this.crossSectionState.domain.xmax / linestringLength);

    if (fStart >= 0.0 && fStart <= 1.0 && fEnd >= 0.0 && fEnd <= 1.0) {
      const coordStart = geometry.getCoordinateAt(fStart);
      const coordEnd = geometry.getCoordinateAt(fEnd);
      const lineStringCoords = geometry.getCoordinates() as [number, number][];

      const coords = [];
      coords.push(coordStart);

      for (const coord of lineStringCoords) {
        const distance = this.getDistanceAtCoord(geometry, coord);
        if (distance >= this.crossSectionState.domain.xmin && distance <= this.crossSectionState.domain.xmax) {
          coords.push(coord);
        }
      }

      coords.push(coordEnd);

      this.domainLinestring.getGeometry()!.setCoordinates(coords);
      if (this.domainLinestringSource.getFeatures().length === 0) {
        this.domainLinestringSource.addFeature(this.domainLinestring);
      }

      // Zoom to extent
      if (this.crossSectionState.syncViews) {
        const view = this.map.getView();
        view.setCenter(this.domainLinestring.getGeometry()!.getCoordinateAt(0.5));
      }
    }
  }

  // Get distance from start on linestring at given coordinate
  getDistanceAtCoord(lineStringGeom: LineString, coord: [number, number]): number {
    const lineStringCoords = lineStringGeom.getCoordinates();
    let distance = 0;

    // Iterate over each segment of the linestring
    for (let i = 0; i < lineStringCoords.length - 1; i++) {
      const p1 = lineStringCoords[i];
      const p2 = lineStringCoords[i + 1];

      let segment = new LineString([p1, p2]);
      const intersects = segment.intersectsCoordinate(coord);

      if (intersects) {
        segment = new LineString([p1, coord]);
        distance += segment.getLength();
        break;
      }
      distance += segment.getLength();
    }

    return distance;
  }

  shiftLinestring(shift: [number, number] = [0.0, 0.0]): void {
    this.crossSectionState.linestringCoordinates = this.crossSectionState.linestringCoordinates.map(
      (x: [number, number]) => [x[0] + shift[0], x[1] + shift[1]]
    );
  }

  drawPointer(coords: [number, number]): void {
    const geometry = this.pointer.getGeometry();

    if (!geometry) {
      return;
    }

    geometry.setCoordinates(coords);

    if (this.pointerSource.getFeatures().length === 0) {
      this.pointerSource.addFeature(this.pointer);
    }
  }

  drawMapMarkers(): void {
    if (!this.linestring) {
      console.warn('drawMapMarkers: Linestring is undefined, unable to draw markers on map');
      return;
    }

    // Clear markers on the map
    this.points = [];

    this.crossSectionState.markers.forEach((el: Marker) => {
      // Update markers in state manager
      if (el.update) {
        const coords = this.linestring.getGeometry()!.getCoordinateAt(el.x / this.linestringLength);
        el.xm = coords[0];
        el.ym = coords[1];
      }
      el.update = false;

      // Update markers on map
      const mapPoint = new Feature({
        geometry: new Point([el.xm as number, el.ym as number]),
        id: el.id,
        label: el.label,
        Z: el.y.toFixed(2),
        size: 20,
        show: el.show
      });
      mapPoint.setId(el.id);
      this.points.push(mapPoint);
    });

    // Refresh points layer on map
    this.pointsSource.clear();
    this.pointsSource.addFeatures(this.points);
    this.pointsLayer.setSource(this.pointsSource);
    this.pointsLayer.changed();
  }

  addInteractions(): void {
    this.map.addInteraction(this.drawInteraction);
    this.map.addInteraction(this.modifyInteraction);
  }

  removeInteractions(): void {
    this.map.removeInteraction(this.drawInteraction);
    this.map.removeInteraction(this.modifyInteraction);
  }

  toggleMeasureDraw(): void {
    this.crossSectionState.drawMeasurement = !this.crossSectionState.drawMeasurement;
  }

  toggleMarkerDraw(): void {
    this.crossSectionState.drawMarker = !this.crossSectionState.drawMarker;
  }

  toggleLineDraw(): void {
    this.crossSectionState.drawProfile = !this.crossSectionState.drawProfile;
  }

  setLineDrawingMode(val: boolean): void {
    this.crossSectionState.drawProfile = val;
    if (val) {
      this.addInteractions();
    } else {
      this.removeInteractions();
    }
    super.render();
  }

  setSectionWidth(val: number): void {
    if (
      val <= 0 ||
      val < this.crossSectionState.sectionWidthSettings.min ||
      val > this.crossSectionState.sectionWidthSettings.max
    ) {
      val = this.crossSectionState.sectionWidthSettings.default;
      console.warn(
        `setSectionWidth: Width is not within accepted range [${this.crossSectionState.sectionWidthSettings.min}, ${this.crossSectionState.sectionWidthSettings.max}]. Resetting to default value`
      );
    }
    this.crossSectionState.sectionWidthSettings.value = val;
  }

  setVerticalExaggeration(val: number): void {
    if (
      val <= 0 ||
      val < this.crossSectionState.verticalExaggerationSettings.min ||
      val > this.crossSectionState.verticalExaggerationSettings.max
    ) {
      val = this.crossSectionState.verticalExaggerationSettings.default;
      console.warn(
        `setVerticalExaggeration: vertical exaggeration is not within accepted range [${this.crossSectionState.verticalExaggerationSettings.min}, ${this.crossSectionState.verticalExaggerationSettings.max}]. Resetting to default value`
      );
    }
    this.crossSectionState.verticalExaggerationSettings.value = val;
    super.render();
  }

  setPointSize(val: number): void {
    if (
      val <= 0 ||
      val < this.crossSectionState.pointSizeSettings.min ||
      val > this.crossSectionState.pointSizeSettings.max
    ) {
      val = this.crossSectionState.pointSizeSettings.default;
      console.warn(
        `setPointSize: point size is not within accepted range [${this.crossSectionState.pointSizeSettings.min}, ${this.crossSectionState.pointSizeSettings.max}]. Resetting to default value`
      );
    }
    this.crossSectionState.pointSizeSettings.value = val;
    super.render();
  }

  setBackgroundColor(val: string): void {
    this.crossSectionState.backgroundColor = val;
  }

  setUniformColor(val: string): void {
    this.crossSectionState.colorUniform = val;
  }

  setColorPalette(val: ColorPalette): void {
    this.crossSectionState.colorPalette = val;
  }

  setColorVariable(val: ColorVariable): void {
    this.crossSectionState.colorVariable = val;
    super.render();
  }

  exportFeature(features: Feature[], filename: string, format: VectorFeatureFileFormat): void {
    switch (format) {
      case 'geojson': {
        const geoJsonString = new GeoJSON().writeFeatures(features, {
          featureProjection: this.state.projection
        });
        download(geoJsonString, filename + '.geojson', 'application/geo+json');
        break;
      }

      case 'kml': {
        const kmlString = new KML().writeFeatures(features, {
          featureProjection: this.state.projection
        });
        download(kmlString, filename + '.kml', 'application/vnd.google-earth.kml+xml');
        break;
      }

      case 'gpx': {
        const gpxString = new GPX().writeFeatures(features, {
          featureProjection: this.state.projection
        });
        download(gpxString, filename + '.gpx', 'application/gpx+xml');
        break;
      }
    }
  }

  renderMeasurementsTable(table: HTMLTableElement, records: Measurement[]): void {
    table.tBodies[0].remove();

    const tableBody = document.createElement('tbody');
    table.appendChild(tableBody);

    // Add rows
    records.forEach((_d: Measurement) => {
      const from = this.crossSectionState.markers.find((x) => x.id === _d['from']);
      const to = this.crossSectionState.markers.find((x) => x.id === _d['to']);

      const newRow = tableBody.insertRow(-1);
      newRow.id = `row-${_d.id}`;

      // Add cell to the row

      // FROM > TO
      const cell1 = newRow.insertCell(-1);
      cell1.classList.add('table-cell');
      cell1.style.setProperty('text-align', 'center');
      cell1.innerHTML = `${from!.label} &rarr; ${to!.label}`;

      // DISTANCE
      let cell = newRow.insertCell(-1);
      cell.classList.add('table-cell');
      cell.style.setProperty('text-align', 'right');
      cell.innerHTML = `${_d['distance'].toFixed(2)}`;

      // SLOPE
      cell = newRow.insertCell(-1);
      cell.classList.add('table-cell');
      cell.style.setProperty('text-align', 'right');
      cell.innerHTML = `${(100 * _d['slope']).toFixed(2)}%`;

      // COPY BUTTON
      const btn1 = document.createElement('img');
      btn1.title = 'Copy to clipboard';
      btn1.width = 20;
      btn1.classList.add('action-btn');
      btn1.src = 'icons/content_copy.svg';
      btn1.onclick = (_e: Event) => {
        const str = `${_d['id']}, ${_d['from']}, ${_d['to']}, ${_d['distance']}, ${_d['slope']}`;
        navigator.clipboard.writeText(str);
      };

      const cell4 = newRow.insertCell(-1);
      cell4.classList.add('table-cell');
      cell4.style.setProperty('text-align', 'center');
      cell4.appendChild(btn1);
    });
  }

  renderAnnotationsTable(table: HTMLTableElement, records: Marker[]): void {
    table.tBodies[0].remove();

    const tableBody = document.createElement('tbody');
    table.appendChild(tableBody);

    // Add rows
    records.forEach((_d: Marker) => {
      const newRow = tableBody.insertRow(-1);
      newRow.id = `row-${_d.id}`;

      // Add cells to the row

      // MARKER ID
      const cell1 = newRow.insertCell(-1);
      cell1.classList.add('table-cell');
      cell1.style.setProperty('text-align', 'center');
      cell1.innerHTML = `${_d['label']}`;

      // MARKER X
      const cell2 = newRow.insertCell(-1);
      cell2.classList.add('table-cell');
      cell2.style.setProperty('text-align', 'right');
      cell2.innerHTML = `${_d['xm']!.toFixed(2)}<br>${_d['ym']!.toFixed(2)}<br>${_d['y'].toFixed(2)}`;

      // COPY BUTTON
      const btn1 = document.createElement('img');
      btn1.title = 'Copy to clipboard';
      btn1.width = 20;
      btn1.classList.add('action-btn');
      btn1.src = 'icons/content_copy.svg';
      btn1.onclick = (_e: Event) => {
        const str = `${_d['id']}, ${_d['xm']}, ${_d['ym']}, ${_d['y']}, ${_d['x']}`;
        navigator.clipboard.writeText(str);
      };

      const cell4 = newRow.insertCell(-1);
      cell4.classList.add('table-cell');
      cell4.style.setProperty('text-align', 'center');
      cell4.appendChild(btn1);

      // FOCUS BUTTON
      const btn2 = document.createElement('img');
      btn2.title = 'Zoom to marker on map';
      btn2.width = 20;
      btn2.classList.add('action-btn');
      btn2.src = 'icons/loupe.svg';
      btn2.onclick = (_e: Event) => {
        this.zoomToMarker(`${_d['id']}`);
      };

      const cell5 = newRow.insertCell(-1);
      cell5.classList.add('table-cell');
      cell5.style.setProperty('text-align', 'center');
      cell5.appendChild(btn2);

      // DELETE BUTTON
      const btn3 = document.createElement('img');
      btn3.title = 'Delete marker';
      btn3.width = 20;
      btn3.classList.add('action-btn');
      btn3.src = 'icons/delete_forever.svg';
      btn3.onclick = (_e: Event) => {
        this.deleteMarker(_d['id']);
      };

      const cell6 = newRow.insertCell(-1);
      cell6.classList.add('table-cell');
      cell6.style.setProperty('text-align', 'center');
      cell6.appendChild(btn3);
    });
  }

  deleteProfile(): void {
    this.crossSectionState.linestringCoordinates = [];
  }

  deleteMarker(id: string): void {
    const index = this.crossSectionState.markers.findIndex((el: Marker) => el.id === id);

    if (index !== -1) {
      this.crossSectionState.markers.splice(index, 1);
    }
  }

  deleteAllMarkers(): void {
    for (let i = this.crossSectionState.markers.length - 1; i >= 0; i--) {
      if (this.crossSectionState.markers[i].feature === 'marker') {
        this.crossSectionState.markers.splice(i, 1);
      }
    }

    /* Note: the scatterplot class can also use the custom event below to delete markers (instead of reacting to changes 
      in the markers array in the state manager) Dispatch a custom event when the delete annotations button is clicked
      */
    /*
      const event: CustomEvent = new CustomEvent('delete-markers', {
        bubbles: true, // Allows the event to bubble up to the parent
        composed: true // Allows the event to pass through the shadow DOM
      });
      this.dispatchEvent(event);
    */
  }

  deleteAllMeasurements(): void {
    const event: CustomEvent = new CustomEvent('delete-measurements', {
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  resetZoom(): void {
    this.crossSectionState.zoomUpdate = true;
    this.crossSectionState.zoom = { k: 1.0, tx: 0.0, ty: 0.0 };
  }

  zoomToMarker(id: string): void {
    const view = this.map.getView();
    const target = this.pointsSource.getFeatureById(id);

    if (target)
      view.fit(target.getGeometry() as SimpleGeometry, {
        maxZoom: 17,
        size: [200, 200]
      });
  }

  setViewSync(val: boolean): void {
    this.crossSectionState.syncViews = val;
  }

  printPlot(printFileFormat: PrintFileFormat): void {
    const event: CustomEvent = new CustomEvent('print-canvas', {
      detail: { format: printFileFormat },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  setPrintFileFormat(val: PrintFileFormat): void {
    this.crossSectionState.printFileFormat = val;
  }

  setAnnotationsFileFormat(val: VectorFeatureFileFormat): void {
    this.crossSectionState.downloadAnnotationsFormat = val;
  }

  setLineFileFormat(val: VectorFeatureFileFormat): void {
    this.crossSectionState.downloadLinestringFormat = val;
  }

  handleCursorDomainCoordinatesChange(cursorDomainCoordinates: [number, number]) {
    if (this.crossSectionState.linestringCoordinates.length < 2) {
      console.warn(
        'handleCursorDomainCoordinatesChange: Linestring coordinates are undefined, unable to update pointer coordinates'
      );
      return;
    }

    if (!this.linestring) {
      console.warn(
        'handleCursorDomainCoordinatesChange: Linestring is undefined, unable to update pointer coordinates'
      );
      return;
    }

    const geometry = this.linestring.getGeometry();

    if (!geometry) {
      console.warn(
        'handleCursorDomainCoordinatesChange: Linestring geometry is undefined, unable to update pointer coordinates'
      );
      return;
    }

    const f = cursorDomainCoordinates[0] / this.linestringLength;

    if (f >= 0.0 && f <= 1.0) {
      const coords = geometry.getCoordinateAt(f) as [number, number];
      this.drawPointer(coords);
    } else {
      // If the pointer is not located within the extent of the linestring, then clear the pointer from the map
      this.pointerSource.clear();
    }
  }

  // Renders the component or the empty component depending on visibility attribute
  render(): void {
    this.visible ? this.renderComponent() : this.renderEmptyComponent();
  }

  private renderComponent(): void {
    super.render();
    super.girafeTranslate();

    // Tables
    this.markersTable = this.shadowRoot!.getElementById('markers-table') as HTMLTableElement;
    this.measurementsTable = this.shadowRoot!.getElementById('measurements-table') as HTMLTableElement;

    // Enable line drawing mode
    this.setLineDrawingMode(true);

    // Tooltips
    this.activateTooltips(false, [800, 0], 'top-end');
    this.registerEvents();
  }

  // Hide the panel and removes listeners
  private renderEmptyComponent(): void {
    this.state.selection.enabled = true;
    this.deleteProfile();
    this.removeInteractions();
    this.unregisterEvents();
    this.renderEmpty();
  }

  registerEvents(): void {
    this.eventsCallbacks.push(
      // Subscribe to dark mode toggle
      this.subscribe('interface.darkFrontendMode', (_oldValue: boolean, _newValue: boolean) => {
        this.darkFrontendMode = _newValue;
      }),

      // Line drawing mode
      this.subscribe(
        'extendedState.crossSection.drawProfile',
        (_oldVal: boolean, _newVal: boolean, _parent: CrossSectionState) => {
          console.debug(`crossSection.drawProfile changed from: ${_oldVal} to: ${_newVal}`);
          this.setLineDrawingMode(_newVal);
        }
      ),

      // Enable/disable measurement button
      this.subscribe(
        'extendedState.crossSection.enableMeasurement',
        (_oldVal: boolean, _newVal: boolean, _parent: CrossSectionState) => {
          console.debug(`crossSection.enableMeasurement changed from: ${_oldVal} to: ${_newVal}`);
          if (!_newVal) {
            // disable measurement mode
            this.crossSectionState.drawMeasurement = false;
          }
          super.render();
        }
      ),

      // Measurement mode
      this.subscribe(
        'extendedState.crossSection.drawMeasurement',
        (_oldVal: boolean, _newVal: boolean, _parent: CrossSectionState) => {
          console.debug(`crossSection.drawMeasurement changed from: ${_oldVal} to: ${_newVal}`);
          super.render();
        }
      ),

      // Enable/disable annotation (marker drawing) button
      this.subscribe(
        'extendedState.crossSection.enableAnnotation',
        (_oldVal: boolean, _newVal: boolean, _parent: CrossSectionState) => {
          console.debug(`crossSection.enableAnnotation changed from: ${_oldVal} to: ${_newVal}`);
          if (!_newVal) {
            // disable annotation mode
            this.crossSectionState.drawMarker = false;
          }
          super.render();
        }
      ),

      // Annotation (marker drawing) mode
      this.subscribe(
        'extendedState.crossSection.drawMarker',
        (_oldVal: boolean, _newVal: boolean, _parent: CrossSectionState) => {
          console.debug(`crossSection.drawMarker changed from: ${_oldVal} to: ${_newVal}`);
          super.render();
        }
      ),

      // Marker array (change in size)
      this.subscribe(
        'extendedState.crossSection.markers',
        (_oldVal: Marker[], _newVal: Marker[], _parent: CrossSectionState) => {
          console.debug(`Settings |crossSection.markers (array length) changed from: ${_oldVal} to: ${_newVal}`);

          if (this.crossSectionState.linestringCoordinates.length < 2) {
            return;
          }

          // Enable disable annotations (markers) download button
          if (_newVal.length === 0) {
            this.crossSectionState.enableAnnotationsDownload = false;
          } else {
            this.crossSectionState.enableAnnotationsDownload = true;
          }

          this.drawMapMarkers();

          if (this.markersTable) {
            this.renderAnnotationsTable(this.markersTable, this.crossSectionState.markers);
          }

          if (this.measurementsTable) {
            this.renderMeasurementsTable(this.measurementsTable, this.crossSectionState.measurements);
          }
        }
      ),

      // Marker array (change in properties)
      this.subscribe(
        /extendedState\.crossSection\.markers\..*\..*/,
        (_oldVal: Marker[], _newVal: Marker[], _parent: CrossSectionState) => {
          console.debug(`Settings | crossSection.markers (properties) changed from: ${_oldVal} to: ${_newVal}`);

          if (this.crossSectionState.linestringCoordinates.length < 2) {
            return;
          }

          this.drawMapMarkers();

          if (this.markersTable) {
            this.renderAnnotationsTable(this.markersTable, this.crossSectionState.markers);
          }

          if (this.measurementsTable) {
            this.renderMeasurementsTable(this.measurementsTable, this.crossSectionState.measurements);
          }
        }
      ),

      // Cursor domain coordinates
      this.subscribe(
        'extendedState.crossSection.cursorDomainCoordinates',
        (_oldVal: [number, number], _newVal: [number, number], _parent: CrossSectionState) => {
          console.debug(`crossSection.cursorDomainCoordinates changed from: ${_oldVal} to: ${_newVal}`);
          this.handleCursorDomainCoordinatesChange(_newVal);
        }
      ),

      // Map-Profile view synchronization mode
      this.subscribe(
        'extendedState.crossSection.syncViews',
        (_oldVal: boolean, _newVal: boolean, _parent: CrossSectionState) => {
          console.debug(`crossSection.syncViews changed from: ${_oldVal} to: ${_newVal}`);
          super.render();
        }
      ),

      // Annotations download enabled/disabled
      this.subscribe(
        'extendedState.crossSection.enableAnnotationsDownload',
        (_oldVal: boolean, _newVal: boolean, _parent: CrossSectionState) => {
          console.debug(`crossSection.enableAnnotationsDownload changed from: ${_oldVal} to: ${_newVal}`);
          super.render();
        }
      ),

      // Linestring download enabled/disabled
      this.subscribe(
        'extendedState.crossSection.enableLinestringDownload',
        (_oldVal: boolean, _newVal: boolean, _parent: CrossSectionState) => {
          console.debug(`crossSection.enableLinestringDownload changed from: ${_oldVal} to: ${_newVal}`);
          super.render();
        }
      ),

      // Profile width
      this.subscribe('extendedState.crossSection.sectionWidthSettings.value', (_oldVal: number, _newVal: number) => {
        console.debug(`crossSection.sectionWidthSettings.value changed from: ${_oldVal} to: ${_newVal}`);
        this.drawLinestringBuffer();
        super.render();
      }),

      // Linestring coordinates
      this.subscribe(
        'extendedState.crossSection.linestringCoordinates',
        (_oldVal: [number, number][], _newVal: [number, number][], _parent: CrossSectionState) => {
          console.debug(`crossSection.linestringCoordinates changed from: ${_oldVal} to: ${_newVal}`);

          // Disable annotation, measurements and downloads buttons if linestring is empty. Switch off drawing and measurement modes.
          const existsLinestring = _newVal.length >= 2;
          this.crossSectionState.enableAnnotation = existsLinestring;
          this.crossSectionState.enableMeasurement = existsLinestring;
          this.crossSectionState.enableLinestringDownload = existsLinestring;
          this.updateLinestringCoordinates();
          super.render();
        }
      ),

      // Profile domain
      this.subscribe(
        'extendedState.crossSection.domain',
        (
          _oldVal: { xmin: number; xmax: number; ymin: number; ymax: number },
          _newVal: { xmin: number; xmax: number; ymin: number; ymax: number },
          _parent: CrossSectionState
        ) => {
          console.debug(`crossSection.domain changed from: ${_oldVal} to: ${_newVal}`);
          this.drawDomainLinestring();
        }
      )
    );

    // Listen to keyboard arrow key down events to shift profile
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        this.shiftLinestring([0.0, this.crossSectionState.linestringShift]);
      } else if (e.key === 'ArrowDown') {
        this.shiftLinestring([0.0, -this.crossSectionState.linestringShift]);
      } else if (e.key === 'ArrowLeft') {
        this.shiftLinestring([-this.crossSectionState.linestringShift, 0.0]);
      } else if (e.key === 'ArrowRight') {
        this.shiftLinestring([this.crossSectionState.linestringShift, 0.0]);
      }
    });
  }

  unregisterEvents(): void {
    this.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;

    // Unregister drawing interaction events
    this.drawInteraction.un('drawstart', () => {});
    this.drawInteraction.un('drawend', () => {});
    this.modifyInteraction.un('modifystart', () => {});
    this.modifyInteraction.un('modifyend', () => {});
  }

  registerVisibilityEvents(): void {
    this.subscribe('interface.crossSectionPanelVisible', (_oldValue: boolean, _newValue: boolean) =>
      this.togglePanel(_newValue)
    );
  }

  private async togglePanel(visible: boolean): Promise<void> {
    this.visible = visible;
    this.state.selection.enabled = !this.visible;
    this.render();
  }

  connectedCallback(): void {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerVisibilityEvents();
    });
  }
}

export default CrossSectionSettingsComponent;
