import ConfigManager from '../../tools/configuration/configmanager';
import StateManager from '../../tools/state/statemanager';
import ShapeNamer from './shapeNamer';
import { v4 as uuidv4 } from 'uuid';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';
import { toRadians } from 'ol/math';

export enum DrawingShape {
  Point,
  Polyline,
  Polygon,
  Square,
  Rectangle,
  Disk,
  FreehandPolyline,
  FreehandPolygon
}

export type ArrowStyle = 'none' | 'start' | 'end' | 'both';
export type ArrowPosition = 'whole' | 'each' | 'mid';
export type LineStroke = 'full' | 'dash' | 'dot' | 'double';

export class DrawingState {
  activeTool: DrawingShape | null = null;
  features: DrawingFeature[] = [];
}

export type SerializedFeature = {
  n: string;
  sc: string;
  sw: number;
  fc: string;
  ls: string;
  as: string;
  ap: string;
  nfz: number;
  mfz: number;
  f: string;
  g: object;
  dn: boolean;
  dm: boolean;
  nc: string;
  mc: string;
  s: boolean;
  t: DrawingShape;
};

export default class DrawingFeature {
  private _tool: DrawingShape;
  private _name: string;
  private _nameColor: string;
  private _strokeColor: string;
  private _strokeWidth: number;
  private _fillColor: string;
  private _lineStroke: LineStroke = 'full';
  private _arrowStyle: ArrowStyle = 'none';
  private _arrowPosition: ArrowPosition = 'whole';
  private _nameFontSize: number;
  private _measureFontSize: number;
  private _measureColor: string;
  private _font: string;
  private _displayName: boolean = true;
  private _displayMeasure: boolean = true;
  private _selected: boolean = false;

  geojson: object;
  id: string = uuidv4();
  onChange: (f: DrawingFeature) => void = () => {};

  constructor(tool: DrawingShape, geojson: object = {}, name: string | null = null) {
    const defaultConfig = ConfigManager.getInstance().Config.drawing;
    this._tool = tool;
    this._name = name == null ? ShapeNamer.getRandomName(DrawingShape[tool]) : name;
    this._strokeColor = defaultConfig.defaultStrokeColor;
    this._strokeWidth = defaultConfig.defaultStrokeWidth;
    this._fillColor = defaultConfig.defaultFillColor;
    this._nameFontSize = defaultConfig.defaultTextSize;
    this._measureFontSize = defaultConfig.defaultTextSize;
    this._font = defaultConfig.defaultFont;
    this.geojson = geojson;
    this._nameColor = '#000000';
    this._measureColor = '#000000';
  }

  get name() {
    return this._name;
  }
  set name(v) {
    this._name = v;
    this.onChange(this);
  }

  get strokeColor() {
    return this._strokeColor;
  }
  set strokeColor(v) {
    this._strokeColor = v;
    this.onChange(this);
  }

  get strokeWidth() {
    return this._strokeWidth;
  }
  set strokeWidth(v) {
    this._strokeWidth = v;
    this.onChange(this);
  }

  get lineStroke() {
    return this._lineStroke;
  }
  set lineStroke(v) {
    this._lineStroke = v;
    this.onChange(this);
  }

  get fillColor() {
    return this._fillColor;
  }
  set fillColor(v) {
    this._fillColor = v;
    this.onChange(this);
  }

  get arrowStyle() {
    return this._arrowStyle;
  }
  set arrowStyle(v) {
    this._arrowStyle = v;
    this.onChange(this);
  }

  get arrowPosition() {
    return this._arrowPosition;
  }
  set arrowPosition(v) {
    this._arrowPosition = v;
    this.onChange(this);
  }

  get nameFontSize() {
    return this._nameFontSize;
  }
  set nameFontSize(v) {
    this._nameFontSize = v;
    this.onChange(this);
  }

  get measureFontSize() {
    return this._measureFontSize;
  }
  set measureFontSize(v) {
    this._measureFontSize = v;
    this.onChange(this);
  }

  get font() {
    return this._font;
  }
  set font(v) {
    this._font = v;
    this.onChange(this);
  }

  get displayName() {
    return this._displayName;
  }
  set displayName(v) {
    this._displayName = v;
    this.onChange(this);
  }

  get displayMeasure() {
    return this._displayMeasure;
  }
  set displayMeasure(v) {
    this._displayMeasure = v;
    this.onChange(this);
  }

  get nameColor() {
    return this._nameColor;
  }
  set nameColor(v) {
    this._nameColor = v;
    this.onChange(this);
  }

  get measureColor() {
    return this._measureColor;
  }
  set measureColor(v) {
    this._measureColor = v;
    this.onChange(this);
  }

  get type() {
    return this._tool;
  }

  get selected() {
    return this._selected;
  }

  set selected(v) {
    this._selected = v;
    this.onChange(this);
  }

  addToState() {
    (StateManager.getInstance().state.extendedState.drawing as DrawingState).features.push(this);
  }

  serialize(): SerializedFeature {
    return {
      n: this._name,
      sc: this._strokeColor,
      sw: this._strokeWidth,
      ls: this._lineStroke,
      as: this._arrowStyle,
      ap: this._arrowPosition,
      fc: this._fillColor,
      nfz: this._nameFontSize,
      mfz: this._measureFontSize,
      f: this._font,
      g: this.geojson,
      t: this._tool,
      dn: this._displayName,
      dm: this._displayMeasure,
      nc: this._nameColor,
      mc: this._measureColor,
      s: this._selected
    };
  }

  getLengthText(length: number) {
    if (this.displayMeasure) {
      return length > 100 ? (length / 1000).toFixed(2) + ' km' : length.toFixed(2) + ' m';
    } else {
      return '';
    }
  }

  getAreaText(area: number) {
    if (this.displayMeasure) {
      return area > 10000 ? (area / 1000000).toFixed(2) + ' km²' : area.toFixed(2) + ' m²';
    } else {
      return '';
    }
  }

  getCoordText(coord: number[]) {
    if (!this.displayMeasure) {
      return '';
    } else if (coord.length > 2) {
      return 'E ' + coord[0].toFixed(2) + '\nN ' + coord[1].toFixed(2) + '\nH ' + coord[2].toFixed(2);
    } else {
      return 'E ' + coord[0].toFixed(2) + '\nN ' + coord[1].toFixed(2);
    }
  }

  isPointOrPolyline() {
    return (
      this.type == DrawingShape.Point ||
      this.type == DrawingShape.Polyline ||
      this.type == DrawingShape.FreehandPolyline
    );
  }

  getVertexStyle(activeNode: boolean = false): Style {
    const defaultConfig = ConfigManager.getInstance().Config.drawing;
    return new Style({
      zIndex: 1002,
      image: new RegularShape({
        points: 4,
        radius: activeNode ? defaultConfig.defaultVertexRadius + 2 : defaultConfig.defaultVertexRadius,
        angle: toRadians(45),
        rotateWithView: false,
        fill: new Fill({
          color: defaultConfig.defaultVertexFillColor
        }),
        stroke: new Stroke({
          color: this.strokeColor,
          width: activeNode ? defaultConfig.defaultVertexStrokeWidth + 2 : defaultConfig.defaultVertexStrokeWidth
        })
      })
    });
  }

  static deserialize(serializedFeature: SerializedFeature) {
    const newFeature = new DrawingFeature(serializedFeature.t, serializedFeature.g, serializedFeature.n);
    newFeature.strokeColor = serializedFeature.sc;
    newFeature.strokeWidth = serializedFeature.sw;
    newFeature.lineStroke = serializedFeature.ls as LineStroke;
    newFeature.arrowStyle = serializedFeature.as as ArrowStyle;
    newFeature.arrowPosition = serializedFeature.ap as ArrowPosition;
    newFeature.fillColor = serializedFeature.fc;
    newFeature.nameFontSize = serializedFeature.nfz;
    newFeature.measureFontSize = serializedFeature.mfz;
    newFeature.font = serializedFeature.f;
    newFeature.geojson = serializedFeature.g;
    newFeature.displayName = serializedFeature.dn;
    newFeature.displayMeasure = serializedFeature.dm;
    newFeature.nameColor = serializedFeature.nc;
    newFeature.measureColor = serializedFeature.mc;
    newFeature.selected = serializedFeature.s;
    newFeature.addToState();
    return newFeature;
  }

  static circleToPolygon(center: number[], radius: number, nbEdges: number = 300) {
    const positions: number[][] = [];
    for (let i = 0; i < 2 * Math.PI; i += (2 * Math.PI) / nbEdges) {
      positions.push([center[0] + radius * Math.cos(i), center[1] + radius * Math.sin(i)]);
    }
    return [...positions, positions[0]];
  }
}
