import ConfigManager from '../../tools/configuration/configmanager';
import StateManager from '../../tools/state/statemanager';
import RedliningShape from './redliningshape';
import ShapeNamer from './shapeNamer';
import { v4 as uuidv4 } from 'uuid';

type RedliningConfig = {
  activeTool: RedliningShape | null;
  features: RedliningFeature[];
};

type SerializedFeature = {
  n: string;
  sc: string;
  sw: number;
  fc: string;
  fz: number;
  f: string;
  g: object;
  t: RedliningShape;
};

export default class RedliningFeature {
  private _uid: string = uuidv4();
  private _onRemove = () => {};
  private _tool: RedliningShape;

  private _name: string;
  private _nameCb = (_: string) => {};

  private _strokeColor: string;
  private _strokeColorCb = (_: string) => {};

  private _strokeWidth: number;
  private _strokeWidthCb = (_: number) => {};

  private _fillColor: string;
  private _fillColorCb = (_: string) => {};

  private _fontSize: number;
  private _fontSizeCb = (_: number) => {};

  private _font: string;
  private _fontCb = (_: string) => {};

  private _geojson: object;

  constructor(tool: RedliningShape, geojson: object = {}, name: string | null = null) {
    const defaultConfig = ConfigManager.getInstance().Config.redlining;

    this._tool = tool;
    this._name = name == null ? ShapeNamer.getRandomName(tool) : name;
    this._strokeColor = defaultConfig.defaultStrokeColor;
    this._strokeWidth = defaultConfig.defaultStrokeWidth;
    this._fillColor = defaultConfig.defaultFillColor;
    this._fontSize = defaultConfig.defaultTextSize;
    this._font = defaultConfig.defaultFont;
    this._geojson = geojson;
  }

  get name() {
    return this._name;
  }
  set name(v) {
    this._name = v;
    this._nameCb(v);
  }
  onNameChange(f: (_: string) => void) {
    this._nameCb = f;
  }

  get strokeColor() {
    return this._strokeColor;
  }
  set strokeColor(v) {
    this._strokeColor = v;
    this._strokeColorCb(v);
  }
  onStrokeColorChange(f: (_: string) => void) {
    this._strokeColorCb = f;
  }

  get strokeWidth() {
    return this._strokeWidth;
  }
  set strokeWidth(v) {
    this._strokeWidth = v;
    this._strokeWidthCb(v);
  }
  onStrokeWidthChange(f: (_: number) => void) {
    this._strokeWidthCb = f;
  }

  get fillColor() {
    return this._fillColor;
  }
  set fillColor(v) {
    this._fillColor = v;
    this._fillColorCb(v);
  }
  onFillColorChange(f: (_: string) => void) {
    this._fillColorCb = f;
  }

  get fontSize() {
    return this._fontSize;
  }
  set fontSize(v) {
    this._fontSize = v;
    this._fontSizeCb(v);
  }
  onFontSizeChange(f: (_: number) => void) {
    this._fontSizeCb = f;
  }

  get font() {
    return this._font;
  }
  set font(v) {
    this._font = v;
    this._fontCb(v);
  }
  onFontChange(f: (_: string) => void) {
    this._fontCb = f;
  }

  get id() {
    return this._uid;
  }
  get geojson() {
    return this._geojson;
  }
  get type() {
    return this._tool;
  }

  update() {
    this._nameCb(this._name);
    this._strokeColorCb(this._strokeColor);
    this._strokeWidthCb(this._strokeWidth);
    this._fillColorCb(this._fillColor);
    this._fontSizeCb(this._fontSize);
  }

  onRemove(f: () => void) {
    this._onRemove = f;
  }
  remove() {
    this._onRemove();
  }
  addToState() {
    const state = StateManager.getInstance().state.extendedState.redlining as RedliningConfig;
    state.features.push(this);
  }

  serialize(): SerializedFeature {
    return {
      n: this._name,
      sc: this._strokeColor,
      sw: this._strokeWidth,
      fc: this._fillColor,
      fz: this._fontSize,
      f: this._font,
      g: this._geojson,
      t: this._tool
    };
  }

  static deserialize(serializedFeature: SerializedFeature) {
    const newFeature = new RedliningFeature(serializedFeature.t, serializedFeature.g, serializedFeature.n);
    newFeature.strokeColor = serializedFeature.sc;
    newFeature.strokeWidth = serializedFeature.sw;
    newFeature.fillColor = serializedFeature.fc;
    newFeature.fontSize = serializedFeature.fz;
    newFeature.font = serializedFeature.f;
    newFeature._geojson = serializedFeature.g;
    newFeature.addToState();
    return newFeature;
  }

  static round(nb: number) {
    return nb.toFixed(2);
  }

  static formatDistance(dist: number) {
    return dist > 100 ? RedliningFeature.round(dist / 1000) + ' km' : RedliningFeature.round(dist) + ' m';
  }
  static formatArea(area: number) {
    return area > 10000 ? RedliningFeature.round(area / 1000000) + ' km²' : RedliningFeature.round(area) + ' m²';
  }
}
