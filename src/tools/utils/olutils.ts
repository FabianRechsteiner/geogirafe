import type { EventsKey } from 'ol/events';
import { Map } from 'ol';
import type BaseLayer from 'ol/layer/Base';
import type Feature from 'ol/Feature';
import { fromCircle } from 'ol/geom/Polygon.js';
import { Coordinate } from 'ol/coordinate';
import { Projection, get as getProjection, ProjectionLike } from 'ol/proj';
import { getDistance as getSphericalDistance, getArea as getSphericalArea } from 'ol/sphere';
import { unByKey } from 'ol/Observable';
import { Circle, Geometry, LineString, Polygon } from 'ol/geom';
import GeoConsts from '../geoconsts';
import { buffer } from 'ol/extent';
import { Pixel } from 'ol/pixel';

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
export const getDistance = (coordinates: Coordinate[], projection: string) => {
  if (isProjectionInDegrees(projection)) {
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
export const getArea = (polygon: Polygon, projection: string) => {
  if (isProjectionInDegrees(projection)) {
    return getSphericalArea(polygon, {
      projection: getProjection(projection)!
    });
  }
  return polygon.getArea();
};

const isProjectionInDegrees = (proj: string): boolean => {
  const projection: Projection | null = getProjection(proj);
  return projection?.getUnits() === 'degrees';
};

export const isCoordinateInDegrees = (coordinate: Coordinate): boolean => {
  return coordinate[0] > -90 && coordinate[0] < 90 && coordinate[1] > -180 && coordinate[1] < 180;
};

export const getSelectionBoxFromMapClick = (
  eventCoordinate: Pixel | [number, number],
  olMap: Map,
  pixelTolerance: number
): number[] => {
  const pointExtent = [...eventCoordinate, ...eventCoordinate];
  const pixelExtent = buffer(pointExtent, pixelTolerance);
  const mapExtent = [
    ...olMap.getCoordinateFromPixel([pixelExtent[0], pixelExtent[1]]),
    ...olMap.getCoordinateFromPixel([pixelExtent[2], pixelExtent[3]])
  ];
  // Because the pixel origin is in the top left corner and the coordinate origin (in projected crs) is in the lower
  // left corner, the extent is switched to [xmin, ymin, xmax, ymax]
  return [
    Math.min(mapExtent[0], mapExtent[2]),
    Math.min(mapExtent[1], mapExtent[3]),
    Math.max(mapExtent[0], mapExtent[2]),
    Math.max(mapExtent[1], mapExtent[3])
  ];
};

export const reprojectGeometry = (
  geometry: Geometry,
  sourceProjection: ProjectionLike,
  destinationProjection: ProjectionLike
) => {
  try {
    if (typeof sourceProjection === 'string') {
      sourceProjection = getProjection(sourceProjection) ?? undefined;
    }
    if (typeof destinationProjection === 'string') {
      destinationProjection = getProjection(destinationProjection) ?? undefined;
    }
    if (!sourceProjection || !destinationProjection) {
      throw new Error(`Not able to reproject geometry, invalid or unknown projection used.`);
    }
    const reprojectedGeometry = geometry.clone();
    return reprojectedGeometry.transform(sourceProjection, destinationProjection);
  } catch (e) {
    throw new Error(`Not able to reproject geometry: ${e}`);
  }
};
