import { Circle, Geometry, LineString, Point, Polygon } from 'ol/geom';
import Feature from 'ol/Feature';
import { SharedFeature, SharedFeatureAttributes, SharedGeometryType } from './sharedstate';
import { Coordinate } from 'ol/coordinate';

class FeatureSerializer {
  private precision: number;

  constructor(precision: number) {
    this.precision = precision;
  }

  public getSerializedFeatures(olFeatures: Feature<Geometry>[]): SharedFeature[] {
    const sharedFeatures: SharedFeature[] = [];
    for (const olFeature of olFeatures) {
      const sharedFeature = this.getFeature(olFeature);
      sharedFeatures.push(sharedFeature);
    }
    return sharedFeatures;
  }

  private getFeature(olFeature: Feature<Geometry>): SharedFeature {
    const geometry = olFeature.getGeometry();
    if (!geometry) {
      throw new Error('Geometry is null. Why ???');
    }

    let sharedFeature;
    switch (geometry.getType()) {
      case 'Point':
        sharedFeature = this.getPoint(geometry as Point);
        break;
      case 'LineString':
        sharedFeature = this.getLineString(geometry as LineString);
        break;
      case 'Polygon':
        sharedFeature = this.getPolygon(geometry as Polygon);
        break;
      case 'Circle':
        sharedFeature = this.getCircle(geometry as Circle);
        break;
      default:
        throw new Error('Unsupported Geometry type !');
    }

    sharedFeature.p = this.getAttributes(olFeature);
    return sharedFeature;
  }

  private getCircle(circle: Circle): SharedFeature {
    const center = circle.getCenter().map((coord) => this.simplify(coord));
    const radius = this.simplify(circle.getRadius());

    return {
      t: SharedGeometryType.Circle,
      g: [center, radius]
    };
  }

  private getPolygon(polygons: Polygon): SharedFeature {
    const simplifiedGeometry = [];
    for (const polygon of polygons.getCoordinates()) {
      const simplifiedPolygon = polygon.map((coords) => this.simplify(coords));
      simplifiedGeometry.push(simplifiedPolygon);
    }

    return {
      t: SharedGeometryType.Polygon,
      g: simplifiedGeometry
    };
  }

  private getLineString(linestring: LineString): SharedFeature {
    const simplifiedGeometry = linestring.getCoordinates().map((coords) => this.simplify(coords));
    return {
      t: SharedGeometryType.LineString,
      g: simplifiedGeometry
    };
  }

  private getPoint(point: Point): SharedFeature {
    const simplifiedGeometry = this.simplify(point.getCoordinates());
    return {
      t: SharedGeometryType.Point,
      g: simplifiedGeometry
    };
  }

  private simplify(coords: Coordinate): Coordinate;
  private simplify(coord: number): number;
  private simplify(coords: number | number[]): number | Coordinate {
    if (Array.isArray(coords)) {
      return coords.map((coord) => parseFloat(coord.toFixed(this.precision))) as Coordinate;
    }
    if (typeof coords == 'number') {
      return parseFloat(coords.toFixed(this.precision));
    }

    throw new Error('Cannot simplify this geometry.');
  }

  private getAttributes(olFeature: Feature<Geometry>): SharedFeatureAttributes {
    const olProperties = olFeature.getProperties();

    const properties: SharedFeatureAttributes = {};
    if ('name' in olProperties) {
      properties.n = olProperties.name;
    }
    if ('textSize' in olProperties) {
      properties.t = olProperties.textSize;
    }
    if ('fillColor' in olProperties) {
      properties.f = olProperties.fillColor;
    }
    if ('strokeWidth' in olProperties) {
      properties.w = olProperties.strokeWidth;
    }
    if ('strokeColor' in olProperties) {
      properties.o = olProperties.strokeColor;
    }

    return properties;
  }
}

export default FeatureSerializer;
