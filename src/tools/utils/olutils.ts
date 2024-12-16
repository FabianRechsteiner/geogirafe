import type { EventsKey } from 'ol/events';
import type { Map } from 'ol';
import type BaseLayer from 'ol/layer/Base';
import type Feature from 'ol/Feature';
import { fromCircle } from 'ol/geom/Polygon.js';
import { Coordinate } from 'ol/coordinate';
import { Projection, get as getProjection } from 'ol/proj';
import { getDistance as getSphericalDistance, getArea as getSphericalArea } from 'ol/sphere';
import { unByKey } from 'ol/Observable';
import { Circle, LineString, Polygon } from 'ol/geom';
import GeoConsts from '../geoconsts';
import StateManager from '../state/statemanager';

/**
 * Unsubscribe to all OpenLayer listeners.
 */
export const unByKeyAll = (eventKeys: EventsKey[]) => {
  eventKeys.forEach((eventKey) => unByKey(eventKey));
};

/**
 * @returns a layer in the map that match the given name (property name).
 */
export const getOlayerByName = (map: Map, layerName: string): BaseLayer | undefined => {
  return map.getAllLayers().find((layer) => layer.get('name') === layerName);
};

/**
 * Clone the properties of the given feature and delete ol properties to keep only the feature "app" properties.
 * Handle map server values served as object and serve them as "simple" values.
 */
export const removeUnwantedOlParams = (feature: Feature, keepGeom = false): Record<string, unknown> => {
  const properties = { ...feature.getProperties() };
  delete properties.boundedBy;
  if (!keepGeom) {
    delete properties[feature.getGeometryName()];
  }
  // Handle map server values served as object.
  Object.keys(properties).forEach((key) => {
    const value = properties[key];
    if (typeof value === 'object') {
      if (value['xsi:nil'] === 'true') {
        properties[key] = undefined;
      } else if (value['_content_']) {
        properties[key] = value['_content_'];
      }
    }
  });
  return properties;
};

/**
 * @returns A polygon generated from the circle.
 */
export const polygonFromCircle = (geometry: Circle) => {
  return fromCircle(geometry, GeoConsts.CIRCLE_TO_POLYGON_SIDES);
};

/**
 * @param coordinates ol Coordinate list
 * @returns the length between coordinates, considering the current map projection (projected or geographic)
 */
export const getDistance = (coordinates: Coordinate[]) => {
  const projection: Projection | null = getProjection(StateManager.getInstance().state.projection);
  if (projection?.getUnits() === 'degrees') {
    let totalLength = 0;
    coordinates.forEach((coordinate, idx) => {
      if (coordinates[idx + 1]) {
        totalLength += getSphericalDistance(coordinate, coordinates[idx + 1]);
      }
    });
    return totalLength;
  }
  return new LineString(coordinates).getLength();
};

/**
 * @param polygon ol Polygon
 * @returns the area of a polygon, considering the current map projection (projected or geographic)
 */
export const getArea = (polygon: Polygon) => {
  const projection: Projection | null = getProjection(StateManager.getInstance().state.projection);
  if (projection?.getUnits() === 'degrees') {
    return getSphericalArea(polygon, { projection: projection! });
  }
  return polygon.getArea();
};
