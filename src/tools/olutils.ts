import { EventsKey } from 'ol/events';
import { unByKey } from 'ol/Observable';
import { Map } from 'ol';
import BaseLayer from 'ol/layer/Base';
import Feature from 'ol/Feature';

/**
 * Unsubscribe to all OpenLayer listeners.
 */
export const unByKeyAll = (eventKeys: EventsKey[]) => {
  eventKeys.forEach((eventKey) => unByKey(eventKey));
};

/**
 * @returns a layer in the map that match the given name (property name).
 */
export const getLayerByName = (map: Map, layerName: string): BaseLayer | undefined => {
  return map.getAllLayers().find((layer) => layer.get('name') === layerName);
};

/**
 * Clone the properties of the given feature and delete ol properties to keep only the feature "app" properties.
 */
export const deleteFeatureOlParams = (feature: Feature): Record<string, unknown> => {
  const properties = { ...feature.getProperties() };
  delete properties.boundedBy;
  delete properties[feature.getGeometryName()];
  return properties;
};
