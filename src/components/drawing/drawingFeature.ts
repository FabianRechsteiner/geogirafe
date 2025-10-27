import { v4 as uuidv4 } from 'uuid';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';
import { toRadians } from 'ol/math';
import type { IBrainSerializable } from '../../tools/state/brain/decorators';
import type { Circle as CircleGeom, Geometry } from 'ol/geom';
import type Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import IGirafeContext from '../../tools/context/icontext';

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

export class DrawingState implements IBrainSerializable {
  isBrainSerializable = true;
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
  private readonly _tool: DrawingShape;
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
  private _displayName = true;
  private _displayMeasure = true;
  private _selected = false;

  public geojson: object = {};
  id: string = uuidv4();
  onChange: (f: DrawingFeature) => void = () => {};

  private readonly drawingState: DrawingState;
  private readonly defaultDrawingConfig: any;

  constructor(tool: DrawingShape, drawingState: DrawingState, drawingConfig: any) {
    this.defaultDrawingConfig = drawingConfig;
    this.drawingState = drawingState;
    this._tool = tool;
    this._name = this.getDefaultName(DrawingShape[tool]);
    this._strokeColor = this.defaultDrawingConfig.defaultStrokeColor;
    this._strokeWidth = this.defaultDrawingConfig.defaultStrokeWidth;
    this._fillColor = this.defaultDrawingConfig.defaultFillColor;
    this._nameFontSize = this.defaultDrawingConfig.defaultTextSize;
    this._measureFontSize = this.defaultDrawingConfig.defaultTextSize;
    this._font = this.defaultDrawingConfig.defaultFont;
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
    this.drawingState.features.push(this);
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
    }
    return '';
  }

  getAreaText(area: number) {
    if (this.displayMeasure) {
      return area > 10000 ? (area / 1000000).toFixed(2) + ' km²' : area.toFixed(2) + ' m²';
    }
    return '';
  }

  getCoordText(coord: number[]) {
    if (!this.displayMeasure) {
      return '';
    }

    if (coord.length > 2) {
      return 'E ' + coord[0].toFixed(2) + '\nN ' + coord[1].toFixed(2) + '\nH ' + coord[2].toFixed(2);
    }
    return 'E ' + coord[0].toFixed(2) + '\nN ' + coord[1].toFixed(2);
  }

  isPointOrPolyline() {
    return (
      this.type === DrawingShape.Point ||
      this.type === DrawingShape.Polyline ||
      this.type === DrawingShape.FreehandPolyline
    );
  }

  getVertexStyle(activeNode = false): Style {
    const defaultConfig = this.defaultDrawingConfig;
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

  static deserialize(serializedFeature: SerializedFeature, context: IGirafeContext) {
    console.log(serializedFeature);

    const newFeature = new DrawingFeature(
      serializedFeature.t,
      context.stateManager.state.extendedState.drawing as DrawingState,
      context.configManager.Config.drawing
    );
    newFeature.geojson = serializedFeature.g;
    newFeature.name = serializedFeature.n;
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

  static circleToPolygon(center: number[], radius: number, nbEdges = 300) {
    const positions: number[][] = [];
    for (let i = 0; i < 2 * Math.PI; i += (2 * Math.PI) / nbEdges) {
      positions.push([center[0] + radius * Math.cos(i), center[1] + radius * Math.sin(i)]);
    }
    return [...positions, positions[0]];
  }

  static geojsonFromOlFeature(olFeature: Feature<Geometry>, shapeType: DrawingShape): object {
    if (shapeType === DrawingShape.Disk) {
      const disk = olFeature.getGeometry()! as CircleGeom;
      return {
        type: 'Feature',
        geometry: {
          type: 'Disk',
          center: disk.getCenter(),
          radius: disk.getRadius()
        }
      };
    }
    return JSON.parse(new GeoJSON().writeFeature(olFeature));
  }

  /**
   * Finds an name composed of the shape type and a number.
   * The number starts from how many shape of the same type type are already in the state +1.
   * Then checks if such candidate name already exists and increments if so.
   * @param geometryTypename
   * @returns
   */
  private getDefaultName(geometryTypename: string): string {
    const shapeTypeId = DrawingShape[geometryTypename as keyof typeof DrawingShape];
    const drawingFeaturesSameType = this.drawingState.features.filter((feat) => feat.type === shapeTypeId);

    const existingNames = drawingFeaturesSameType.map((f) => f.name.toLowerCase().trim());
    let counter = existingNames.length + 1;

    while (true) {
      const nameCandidate = `${geometryTypename} ${counter}`;

      if (existingNames.includes(nameCandidate.toLowerCase())) {
        counter++;
      } else {
        return nameCandidate;
      }
    }
  }
}
