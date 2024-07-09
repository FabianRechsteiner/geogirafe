import type { EventsKey } from 'ol/events';
import type { Map } from 'ol';
import type BaseLayer from 'ol/layer/Base';
import type Feature from 'ol/Feature';
import { fromCircle } from 'ol/geom/Polygon.js';

import { unByKey } from 'ol/Observable';
import { Circle } from 'ol/geom';
import GeoConsts from '../geoconsts';

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
 */
export const deleteFeatureOlParams = (feature: Feature, keepGeom = false): Record<string, unknown> => {
  const properties = { ...feature.getProperties() };
  delete properties.boundedBy;
  if (!keepGeom) {
    delete properties[feature.getGeometryName()];
  }
  return properties;
};

/**
 * @returns A polygon generated from the circle.
 */
export const polygonFromCircle = (geometry: Circle) => {
  return fromCircle(geometry, GeoConsts.CIRCLE_TO_POLYGON_SIDES);
};
