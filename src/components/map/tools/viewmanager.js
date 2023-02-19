import View from 'ol/View';
import { getPointResolution, get as getProjection, transform, METERS_PER_UNIT } from 'ol/proj';
import ConfigManager from "../../../tools/configmanager";
import GeoConsts from '../../../tools/geoconsts';

class ViewManager {
  map = null;
  srid = null;
  get projection() {
    return getProjection(this.srid);
  }

  configManager = null;

  // Those 3 values are linked and can indicate the current zoomlevel/resolution/scale
  zoom = null;
  resolution = null;
  scale = null;

  center = null;
  extent = null;
  scales = null;
  allowedResolutions = null;
  constraintScales = null;

  constructor(map, srid) {
    this.map = map;
    // TODO REG: use global state for this info, or update when map component is updated.
    this.srid = srid;

    this.configManager = ConfigManager.getInstance();
    this.center = this.configManager.Config.map.startPosition.split(',').map(Number);
    this.zoom = Number(this.configManager.Config.map.startZoom);
    this.constraintScales = Number(this.configManager.Config.map.constraintScales);
    this.extent = this.configManager.Config.map.maxExtent.split(',').map(Number);

    this.scales = this.configManager.Config.map.scales;
    this.allowedResolutions = this.scalesToResolutions(this.scales);
  }

  scalesToResolutions(scales) {
    const resolutions = [];
    scales.forEach((scale) => {
      const resolution = this.scaleToResolution(scale);
      resolutions.push(resolution);
    });
    return resolutions;
  }

  scaleToResolution(scale) {
    const unit = this.projection.getUnits();
    const resolution = scale / METERS_PER_UNIT[unit] / GeoConsts.INCHES_PER_METER / GeoConsts.SCREEN_DOTS_PER_INCH;
    return resolution;
  }

  getScale() {
    const unit = this.projection.getUnits();
    const resolution = this.map.getView().getResolution();
    const scale = resolution * METERS_PER_UNIT[unit] * GeoConsts.INCHES_PER_METER * GeoConsts.SCREEN_DOTS_PER_INCH;
    return scale;
  }

  getView() {
    return new View({
      center: this.center,
      zoom: this.zoom,
      projection: this.srid,
      extent: this.extent,
      resolutions: this.allowedResolutions,
      constrainResolution: this.constraintScales
    });
  }

  getViewFromSrid(srid) {
    this.srid = srid;

    const currentView = this.map.getView();
    const currentProjection = currentView.getProjection();

    // Convert old values...
    const currentResolution = currentView.getResolution();
    const currentCenter = currentView.getCenter();
    const currentRotation = currentView.getRotation();
    const currentExtent = currentView.get('extent');

    // ... to new ones
    const newCenter = transform(currentCenter, currentProjection, this.projection);
    const currentMPU = currentProjection.getMetersPerUnit();
    const newMPU = this.projection.getMetersPerUnit();
    const currentPointResolution = getPointResolution(currentProjection, 1 / currentMPU, currentCenter, 'm') * currentMPU;
    const newPointResolution = getPointResolution(this.projection, 1 / newMPU, newCenter, 'm') * newMPU;
    const newResolution = (currentResolution * currentPointResolution) / newPointResolution;
    const newExtentPoint1 = transform([currentExtent[0], currentExtent[1]], currentProjection, this.projection);
    const newExtentPoint2 = transform([currentExtent[2], currentExtent[3]], currentProjection, this.projection);
    const newExtent = [newExtentPoint1[0], newExtentPoint1[1], newExtentPoint2[0], newExtentPoint2[1]];
    this.allowedResolutions = this.scalesToResolutions(this.scales);

    const newView = new View({
      center: newCenter,
      resolution: newResolution,
      rotation: currentRotation,
      projection: this.projection,
      resolutions: this.allowedResolutions,
      constrainResolution: this.constraintScales,
      extent: newExtent
    });
    return newView;
  }

  setCenter(center) {
    this.center = center;
    this.map.getView().setCenter(center);
  }

  setZoom(zoom) {
    // TODO REG : Calculate resolution and scale ?
    this.zoom = zoom;
  }

  setResolution(resolution) {
    // TODO REG : Calculate zoom and scale ?
    this.resolution = resolution;
    this.map.getView().setResolution(this.resolution);
  }

  setScale(scale) {
    // TODO REG : Calculate zoom ?
    this.scale = scale;
    this.resolution = this.scaleToResolution(scale);
    this.map.getView().setResolution(this.resolution);
  }
}

export default ViewManager;