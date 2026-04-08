// SPDX-License-Identifier: Apache-2.0
import type { EventsKey } from 'ol/events';
import { Map } from 'ol';
import type BaseLayer from 'ol/layer/Base';
import type Feature from 'ol/Feature';
import { fromCircle } from 'ol/geom/Polygon.js';
import { Coordinate } from 'ol/coordinate';
import { get as getProjection, Projection, ProjectionLike } from 'ol/proj';
import { getArea as getSphericalArea, getDistance as getSphericalDistance } from 'ol/sphere';
import { unByKey } from 'ol/Observable';
import { Circle, Geometry, LineString, Point, Polygon } from 'ol/geom';
import GeoConsts from '../geoconsts';
import { buffer } from 'ol/extent';
import { Pixel } from 'ol/pixel';
import { Stroke, Style } from 'ol/style';

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
export const getAreaOfPolygon = (polygon: Polygon, projection: string) => {
  if (isProjectionInDegrees(projection)) {
    return getSphericalArea(polygon, {
      projection: getProjection(projection)!
    });
  }
  return polygon.getArea();
};

export const getAreaOfCircle = (circle: Circle, projection: string) => {
  if (isProjectionInDegrees(projection)) {
    return getSphericalArea(circle, {
      projection: getProjection(projection)!
    });
  }
  return Math.PI * Math.pow(circle.getRadius(), 2);
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

export const ensurePolygonIsProperlyClosed = (polygon: Polygon): Coordinate[] => {
  const coordinates = polygon.getCoordinates()[0];
  let segments = [...coordinates];
  if (coordinates.length > 2 && coordinates[0][0] != coordinates[coordinates.length - 1][0]) {
    segments = [...coordinates, coordinates[0]];
    polygon.setCoordinates([segments]);
  }
  return segments;
};

export const getHalfPoint = (coordinates: Coordinate[]): Point => {
  return new Point(new LineString(coordinates).getCoordinateAt(0.5));
};

export const getLabelStyle = (position: Point, text: string, labelStyle: Style): Style | undefined => {
  if (text.trim() != '') {
    const style = labelStyle.clone();
    style.setGeometry(position);
    style.getText()!.setText(text);
    return style;
  }
  return undefined;
};

export const getRadiusDataForCircle = (circle: Circle, defaultStyle: Style, stroke: Stroke) => {
  const radius = circle.getRadius();
  const center = circle.getCenter();
  const pointer = (circle.getProperties()['pointer'] as Coordinate) ?? [center[0] + radius, center[1]];
  const radiusLine = [center, pointer];
  const radiusLineStyle = defaultStyle.clone();
  radiusLineStyle.setStroke(stroke);
  radiusLineStyle.getText()!.setText('');
  radiusLineStyle.setGeometry(new LineString(radiusLine));
  return {
    style: radiusLineStyle,
    radius: radius,
    radiusLine: radiusLine
  };
};

export const getLengthAsMetricText = (length?: number): string => {
  if (length) {
    const formatedLength = length > 100 ? (length / 1000).toFixed(2) + ' km' : length.toFixed(2) + ' m';
    return formatedLength;
  }
  return '';
};

export const getAreaAsMetricText = (area?: number): string => {
  if (area) {
    const formatedArea = area > 10000 ? (area / 1000000).toFixed(2) + ' km²' : area.toFixed(2) + ' m²';
    return formatedArea;
  }
  return '';
};

export const getAzimuthAsText = (azimuth?: number): string => {
  if (azimuth) {
    return `${azimuth.toFixed(0)}°`;
  }
  return '';
}