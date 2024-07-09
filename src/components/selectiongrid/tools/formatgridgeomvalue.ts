import type OlGeomGeometry from 'ol/geom/Geometry';
import { Circle, LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon } from 'ol/geom';
import { getCenter } from 'ol/extent';
import { polygonFromCircle } from '../../../tools/utils/olutils';
import { niceCoordinates } from '../../../tools/geometrytools';
import IconCenter from '../images/center.svg';

/**
 * Generates HTML string containing icons based on the provided geometry.
 */
export default class FormatGridGeomValue {
  private readonly iconCenter = IconCenter;
  private locale: string = '';

  /**
   * @returns The generated HTML string containing the icons, based on the provided geometry.
   */
  getGeometryIcons(geometry: OlGeomGeometry, locale: string): string | undefined {
    this.locale = locale;
    const info = this.getGeometryIconsInfo(geometry);
    if (!info[0]) {
      return;
    }
    let icons = info[0];
    const coords = info[1];

    icons += `<button class="girafe-button-tiny tiny-margin"
                      tip="Pan to geometry"
                      tip-placement="right"
                      onclick="document.geogirafe.state.position.center = [${coords[0]},${coords[1]}]">
                <img alt="recenter-icon" src="${this.iconCenter}" />
              </button>`;

    return icons;
  }

  /**
   * Supports point, multipoint, line, multilines (as line),
   * polygon and multipolygons (as polygon) and circle (as polygon).
   * @return A tuple containing the icon html, based on the given geometry,
   * and coordinates array. Can returns [null, null] in case of not supported geometry.
   */
  private getGeometryIconsInfo(geometry: OlGeomGeometry): [string, number[]] | [null, null] {
    if (geometry instanceof Point) {
      return this.getGeometryIconsInfoPoint(geometry);
    }
    if (geometry instanceof MultiPoint) {
      return this.getGeometryIconsInfoMultiPoint(geometry);
    }
    if (geometry instanceof LineString || geometry instanceof MultiLineString) {
      return this.getGeometryIconsInfoLine(geometry);
    }
    if (geometry instanceof Polygon || geometry instanceof MultiPolygon) {
      return this.getGeometryIconsInfoPolygon(geometry);
    }
    if (geometry instanceof Circle) {
      return this.getGeometryIconsInfoPolygon(polygonFromCircle(geometry));
    }
    console.error('Unknown geometry type', geometry?.getType());
    return [null, null];
  }

  /**
   * @returns A tuple containing the icons and coordinates for a point geometry.
   * @private
   */
  private getGeometryIconsInfoPoint(geometry: Point): [string, number[]] {
    let icons = '<i class="geo-type fg-point fg-lg"></i>';
    const coords = geometry.getFlatCoordinates();
    const niceCoords = niceCoordinates(coords, this.locale);
    icons += `<span>E ${niceCoords[0]} / N ${niceCoords[1]}</span>`;
    return [icons, coords];
  }

  /**
   * @returns A tuple containing the icons and coordinates for a multi point geometry.
   * @private
   */
  private getGeometryIconsInfoMultiPoint(geometry: MultiPoint): [string, number[]] {
    let icons = '<i class="geo-type fg-multipoint fg-lg"></i>';
    if (geometry.getPoints.length === 1) {
      const coords = geometry.getPoint(0).getFlatCoordinates();
      const niceCoords = niceCoordinates(coords, this.locale);
      icons += `<span>E ${niceCoords[0]} / N ${niceCoords[1]}</span>`;
      return [icons, coords];
    }
    const coords = getCenter(geometry.getExtent());
    icons += `<span>Multipoint</span>`;
    return [icons, coords];
  }

  /**
   * @returns A tuple containing the icons and coordinates for a line or multiline geometry.
   * @private
   */
  private getGeometryIconsInfoLine(geometry: LineString | MultiLineString): [string, number[]] {
    let icons = '<i class="geo-type fg-polyline-pt fg-lg"></i>';
    let geoLength;
    if (geometry instanceof MultiLineString) {
      geoLength = geometry.getLineStrings().reduce((length, line) => length + line.getLength(), 0);
    } else {
      geoLength = geometry.getLength();
    }
    const length = (Math.round(geoLength * 100) / 100).toLocaleString(this.locale, {
      minimumFractionDigits: 2
    });
    icons += `<span>${length}&nbsp;m</span>`;
    const coords = getCenter(geometry.getExtent());
    return [icons, coords];
  }

  /**
   * @returns A tuple containing the icons and coordinates for a polygon or multipolygon geometry.
   * @private
   */
  private getGeometryIconsInfoPolygon(geometry: Polygon | MultiPolygon): [string, number[]] {
    let icons = '<i class="geo-type fg-polygon-pt fg-lg"></i>';
    const area = (Math.round(geometry.getArea() * 100) / 100).toLocaleString(this.locale, {
      minimumFractionDigits: 2
    });
    icons += `<span>${area}&nbsp;m<sup>2</sup></span>`;
    const coords = getCenter(geometry.getExtent());
    return [icons, coords];
  }
}
