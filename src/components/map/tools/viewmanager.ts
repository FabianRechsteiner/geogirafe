import View from 'ol/View';
import { get as getProjection, transform } from 'ol/proj';
import ConfigManager from '../../../tools/configuration/configmanager';
import GeoConsts from '../../../tools/geoconsts';
import { Map } from 'ol';
import StateManager from '../../../tools/state/statemanager';

class ViewManager {
  map: Map;

  get state() {
    return StateManager.getInstance().state;
  }

  get projection() {
    return getProjection(this.state.projection)!;
  }

  configManager: ConfigManager;

  scales: number[];
  allowedResolutions: number[];
  constrainScales: boolean;
  constrainRotation: boolean | number;
  view: View;

  constructor(map: Map) {
    this.map = map;

    this.configManager = ConfigManager.getInstance();
    this.constrainScales = this.configManager.Config.map.constrainScales;
    this.constrainRotation = this.configManager.Config.map.constrainRotation;

    this.scales = this.configManager.Config.map.scales;
    this.allowedResolutions = this.scalesToResolutions(this.scales);

    this.view = new View({
      center: this.configManager.Config.map.startPosition.split(',').map(Number),
      zoom: Number(this.configManager.Config.map.startZoom),
      projection: this.configManager.getDefaultConfigValue('map.srid') as string,
      extent: this.configManager.Config.map.maxExtent?.split(',').map(Number),
      resolutions: this.allowedResolutions,
      constrainResolution: this.constrainScales,
      constrainRotation: this.constrainRotation
    });

    const stateManager = StateManager.getInstance();
    this.updateStatePosition();
    stateManager.subscribe(/position(\..*)?/, (_: unknown, _newValue: unknown) => this.onPositionChanged());
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
    const resolution =
      scale /
      (GeoConsts.METERS_PER_UNIT as Record<string, number>)[unit] /
      GeoConsts.INCHES_PER_METER /
      GeoConsts.SCREEN_DOTS_PER_INCH;
    return resolution;
  }

  getScale() {
    const unit = this.projection.getUnits();
    const resolution = this.view.getResolution()!;
    const scale =
      resolution *
      (GeoConsts.METERS_PER_UNIT as Record<string, number>)[unit] *
      GeoConsts.INCHES_PER_METER *
      GeoConsts.SCREEN_DOTS_PER_INCH;
    return scale;
  }

  updateStatePosition() {
    const mapPosition = this.state.position.clone();
    mapPosition.center = this.view.getCenter()!;
    const currentResolution = this.view.getResolution();
    if (currentResolution && currentResolution > 0) {
      mapPosition.resolution = currentResolution;
    }
    mapPosition.zoom = this.view.getZoom() ?? mapPosition.zoom;
    mapPosition.scale = this.getScale();
    this.state.position = mapPosition;
  }

  getDefaultView() {
    return this.view;
  }

  getViewConvertedToSrid(newSrid: string) {
    const currentView = this.view;
    const currentProjection = currentView.getProjection();
    if (currentProjection.getCode() === newSrid) {
      // Nothing to do
      return currentView;
    }

    // Convert old values...
    const currentCenter = currentView.getCenter()!;
    const currentRotation = currentView.getRotation();

    // ... to new ones
    const newCenter = transform(currentCenter, currentProjection, this.projection);
    this.allowedResolutions = this.scalesToResolutions(this.scales);

    // If there is a configured max extent, convert it.
    const currentExtent = currentView.get('extent');
    let newExtent;
    if (currentExtent) {
      const newExtentPoint1 = transform([currentExtent[0], currentExtent[1]], currentProjection, this.projection);
      const newExtentPoint2 = transform([currentExtent[2], currentExtent[3]], currentProjection, this.projection);
      newExtent = [newExtentPoint1[0], newExtentPoint1[1], newExtentPoint2[0], newExtentPoint2[1]];
    }

    const newView = new View({
      center: newCenter,
      zoom: currentView.getZoom(),
      rotation: currentRotation,
      projection: this.projection,
      resolutions: this.allowedResolutions,
      constrainResolution: this.constrainScales,
      constrainRotation: this.constrainRotation,
      extent: newExtent
    });

    this.view = newView;
    this.updateStatePosition();

    return this.view;
  }

  onPositionChanged() {
    const position = this.state.position;
    if (position.zoom && position.zoom !== this.view.getZoom()) {
      this.view.setZoom(position.zoom);
    } else if (position.resolution && position.resolution !== this.view.getResolution() && position.resolution >= 0) {
      this.view.setResolution(position.resolution);
    } else if (position.scale && position.scale !== this.getScale()) {
      this.setScale(position.scale);
    }
    if (position.center && position.center.length === 2 && position.center !== this.view.getCenter()) {
      this.view.setCenter(position.center);
    }
    this.updateStatePosition();
  }

  setScale(scale: number) {
    const resolution = this.scaleToResolution(scale);
    this.view.setResolution(resolution);
  }
}

export default ViewManager;
