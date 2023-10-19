import View from 'ol/View';
import { getPointResolution, get as getProjection, transform } from 'ol/proj';
import ConfigManager from "../../../tools/configmanager";
import GeoConsts from '../../../tools/geoconsts';
import { Map } from 'ol';
import { Coordinate } from 'ol/coordinate';

class ViewManager {
  map: Map;
  srid: string;
  get projection() {
    return getProjection(this.srid)!;
  }

  configManager: ConfigManager;

  // Those 3 values are linked and can indicate the current zoomlevel/resolution/scale
  zoom: number | null = null;
  resolution: number | null = null;
  scale: number | null = null;

  center: number[];
  extent: number[];
  scales: number[];
  allowedResolutions: number[];
  constraintScales: boolean;

  constructor(map: Map, srid: string) {
    this.map = map;
    // TODO REG: use global state for this info, or update when map component is updated.
    this.srid = srid;

    this.configManager = ConfigManager.getInstance();
    this.center = this.configManager.Config.map.startPosition.split(',').map(Number);
    this.zoom = Number(this.configManager.Config.map.startZoom);
    this.constraintScales = this.configManager.Config.map.constraintScales;
    this.extent = this.configManager.Config.map.maxExtent.split(',').map(Number);

    this.scales = this.configManager.Config.map.scales;
    this.allowedResolutions = this.scalesToResolutions(this.scales);
  }

  scalesToResolutions(scales: number[]) {
    const resolutions = new Array<number>();
    scales.forEach((scale) => {
      const resolution = this.scaleToResolution(scale);
      resolutions.push(resolution);
    });
    return resolutions;
  }

  scaleToResolution(scale: number) {
    const unit = this.projection.getUnits();
    const resolution = scale / (GeoConsts.METERS_PER_UNIT as Record<string, number>)[unit] / GeoConsts.INCHES_PER_METER / GeoConsts.SCREEN_DOTS_PER_INCH;
    return resolution;
  }

  getScale() {
    const unit = this.projection.getUnits();
    const resolution = this.map.getView().getResolution()!;
    const scale = resolution * (GeoConsts.METERS_PER_UNIT as Record<string, number>)[unit] * GeoConsts.INCHES_PER_METER * GeoConsts.SCREEN_DOTS_PER_INCH;
    return scale;
  }


  getView() {
    return new View({
      center: this.center,
      zoom: this.zoom ?? undefined,
      projection: this.srid,
      extent: this.extent,
      resolutions: this.allowedResolutions,
      constrainResolution: this.constraintScales
    });
  }

  getViewFromSrid(srid: string) {
    this.srid = srid;

    const currentView = this.map.getView();
    const currentProjection = currentView.getProjection();

    // Convert old values...
    const currentResolution = currentView.getResolution()!;
    const currentCenter = currentView.getCenter()!;
    const currentRotation = currentView.getRotation();
    const currentExtent = currentView.get('extent');

    // ... to new ones
    const newCenter = transform(currentCenter, currentProjection, this.projection);
    const currentMPU = currentProjection.getMetersPerUnit()!;
    const newMPU = this.projection.getMetersPerUnit()!;
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

  setCenter(center: Coordinate) {
    this.center = center;
    this.map.getView().setCenter(center);
  }

  setZoom(zoom: number) {
    this.zoom = zoom;
    this.map.getView().setZoom(this.zoom);
    this.resolution = this.map.getView().getResolution() ?? null;
    this.scale = this.getScale();
  }

  setResolution(resolution: number) {
    this.resolution = resolution;
    this.map.getView().setResolution(this.resolution);
    this.zoom = this.map.getView().getZoom() ?? null;
    this.scale = this.getScale();
  }

  setScale(scale: number) {
    this.scale = scale;
    this.resolution = this.scaleToResolution(scale);
    this.map.getView().setResolution(this.resolution);
    this.zoom = this.map.getView().getZoom() ?? null;
  }
}

export default ViewManager;