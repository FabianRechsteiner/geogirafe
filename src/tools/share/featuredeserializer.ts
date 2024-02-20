import { v4 as uuidv4 } from 'uuid';
import { Circle, Geometry, LineString, Point, Polygon } from 'ol/geom';
import Feature from 'ol/Feature';
import { SharedFeature, SharedGeometryType } from './sharedstate';
import { Coordinate } from 'ol/coordinate';

class FeatureDeserializer {
  public getDeserializedFeatures(sharedFeatures: SharedFeature[]): Feature<Geometry>[] {
    const olFeatures: Feature<Geometry>[] = [];
    for (const sharedFeature of sharedFeatures) {
      const olFeature = this.getFeature(sharedFeature);
      olFeatures.push(olFeature);
    }
    return olFeatures;
  }

  private getFeature(sharedFeature: SharedFeature): Feature<Geometry> {
    let geometry;
    switch (sharedFeature.t) {
      case SharedGeometryType.Point:
        geometry = this.getPoint(sharedFeature);
        break;
      case SharedGeometryType.LineString:
        geometry = this.getLineString(sharedFeature);
        break;
      case SharedGeometryType.Polygon:
        geometry = this.getPolygon(sharedFeature);
        break;
      case SharedGeometryType.Circle:
        geometry = this.getCircle(sharedFeature);
        break;
      default:
        throw new Error('Unsupported Geometry type !');
    }

    const feature = new Feature(geometry);
    this.setAttributes(feature, sharedFeature);
    return feature;
  }

  private getCircle(circle: SharedFeature): Circle {
    const center = (circle.g as [Coordinate, number])[0];
    const radius = (circle.g as [Coordinate, number])[1];

    return new Circle(center, radius);
  }

  private getPolygon(polygons: SharedFeature): Polygon {
    return new Polygon(polygons.g as Coordinate[][]);
  }

  private getLineString(linestring: SharedFeature): LineString {
    return new LineString(linestring.g as Coordinate[]);
  }

  private getPoint(point: SharedFeature): Point {
    return new Point(point.g as Coordinate);
  }

  private setAttributes(olFeature: Feature<Geometry>, sharedFeature: SharedFeature) {
    // First, set an id
    olFeature.setId(uuidv4());

    // Then set other attributes if they exist
    if (sharedFeature.p?.n) {
      olFeature.set('name', sharedFeature.p.n);
    }
    if (sharedFeature.p?.t) {
      olFeature.set('textSize', sharedFeature.p.t);
    }
    if (sharedFeature.p?.f) {
      olFeature.set('fillColor', sharedFeature.p.f);
    }
    if (sharedFeature.p?.w) {
      olFeature.set('strokeWidth', sharedFeature.p.w);
    }
    if (sharedFeature.p?.o) {
      olFeature.set('strokeColor', sharedFeature.p.o);
    }
  }
}

export default FeatureDeserializer;
