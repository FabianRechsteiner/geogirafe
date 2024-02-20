import { getUid } from 'ol/util';
import Feature from 'ol/Feature';

class RedliningFeature {
  _olFeature: Feature;

  constructor(olFeature: Feature) {
    this._olFeature = olFeature;
  }

  get name() {
    return this._olFeature.get('name');
  }

  set name(value) {
    this._olFeature.set('name', value);
  }

  get strokeColor() {
    return this._olFeature.get('strokeColor');
  }

  set strokeColor(value) {
    this._olFeature.set('strokeColor', value);
  }

  get strokeWidth() {
    return this._olFeature.get('strokeWidth');
  }
  set strokeWidth(value) {
    this._olFeature.set('strokeWidth', value);
  }

  get fillColor() {
    return this._olFeature.get('fillColor');
  }
  set fillColor(value) {
    this._olFeature.set('fillColor', value);
  }

  get textSize() {
    return this._olFeature.get('textSize');
  }
  set textSize(value) {
    this._olFeature.set('textSize', value);
  }

  get id() {
    return getUid(this._olFeature);
  }

  get geometry() {
    console.warn('not implemented yet');
    return null;
  }
}

export default RedliningFeature;
