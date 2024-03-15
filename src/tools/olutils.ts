import type { EventsKey } from 'ol/events';
import type { Map } from 'ol';
import type BaseLayer from 'ol/layer/Base';
import type Feature from 'ol/Feature';

import { unByKey } from 'ol/Observable';

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
export const deleteFeatureOlParams = (feature: Feature): Record<string, unknown> => {
  const properties = { ...feature.getProperties() };
  delete properties.boundedBy;
  delete properties[feature.getGeometryName()];
  return properties;
};
