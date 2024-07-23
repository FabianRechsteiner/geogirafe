import olFeature from 'ol/Feature';
import olGeomLineString from 'ol/geom/LineString';
import olGeomPoint from 'ol/geom/Point';
import olStyleFill from 'ol/style/Fill';
import olStyleRegularShape from 'ol/style/RegularShape';
import olStyleStroke from 'ol/style/Stroke';
import olStyleStyle from 'ol/style/Style';
import { saveAs } from 'file-saver';
import { type BaseType, select as d3select } from 'd3';
import type { Coordinate as OlCoordinateCoordinate } from 'ol/coordinate';
import type {
  LidarProfileClientConfig,
  LidarProfileServerConfigClassifications,
  LidarProfileServerConfigLevels
} from './profileconfig';
import I18nManager from '../../../tools/i18n/i18nmanager';
import { getLidarProfileCanvas, getLidarProfileSvg } from './domselector';
import { Buffer } from 'buffer';

/**
 * The object containing all points in profile
 */
export type LidarProfilePoints = {
  distance?: number[];
  altitude?: number[];
  color_packed?: number[][];
  intensity?: number[];
  classification?: number[];
  coords?: number[][];
};

/**
 * Profile point after measure or after parsing of the binary array returned by Pytree
 */
export type LidarPoint = {
  cx?: number;
  cy?: number;
  distance?: number;
  altitude?: number;
  color_packed?: number[];
  coords?: number[];
  intensity?: number;
  classification?: number;
  set?: boolean;
};

type ClippedLine = {
  bufferGeom: olFeature<olGeomLineString>;
  bufferStyle: olStyleStyle[];
  clippedLine: OlCoordinateCoordinate[];
  distanceOffset: number;
};

type NiceLOD = {
  maxLOD: number;
  width: number;
};

export default class {

  /**
   * Clip a linestring with start and end measure given by D3 Chart domain
   *
   * @param linestring an OpenLayers Linestring
   * @param dLeft domain minimum
   * @param dRight domain maximum
   * @returns Object with clipped lined coordinates and left domain value
   */
  clipLineByMeasure(linestring: olGeomLineString, dLeft: number, dRight: number): ClippedLine {
    const clippedLine = new olGeomLineString([]);
    let mileage_start = 0;
    let mileage_end = 0;

    const totalLength = linestring.getLength();
    const fractionStart = dLeft / totalLength;
    const fractionEnd = dRight / totalLength;

    let segNumber = linestring.getCoordinates().length - 1;
    let counter = 0;

    linestring.forEachSegment((segStart, segEnd) => {
      counter += 1;
      const segLine = new olGeomLineString([segStart, segEnd]);
      mileage_end += segLine.getLength();

      if (dLeft == mileage_start) {
        clippedLine.appendCoordinate(segStart);
      } else if (dLeft > mileage_start && dLeft < mileage_end) {
        clippedLine.appendCoordinate(linestring.getCoordinateAt(fractionStart));
      }

      if (mileage_start > dLeft && mileage_start < dRight) {
        clippedLine.appendCoordinate(segStart);
      }

      if (dRight == mileage_end) {
        clippedLine.appendCoordinate(segEnd);
      } else if (dRight > mileage_start && dRight < mileage_end) {
        clippedLine.appendCoordinate(linestring.getCoordinateAt(fractionEnd));
      } else if (dRight > mileage_start && dRight > mileage_end && counter === segNumber) {
        clippedLine.appendCoordinate(linestring.getCoordinateAt(fractionEnd));
      }

      mileage_start += segLine.getLength();
    });

    const feat = /** @type {olFeature<olGeomLineString>} */ new olFeature({
      geometry: clippedLine
    });

    const lineStyle = new olStyleStyle({
      stroke: new olStyleStroke({
        color: 'rgba(255,0,0,1)',
        width: 2,
        lineCap: 'square'
      })
    });

    let firstSegmentAngle = 0;
    let lastSegementAngle = 0;

    segNumber = clippedLine.getCoordinates().length - 1;
    let segCounter = 1;

    clippedLine.forEachSegment((start, end) => {
      if (segCounter == 1) {
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        firstSegmentAngle = Math.atan2(dx, dy);
      }

      if (segCounter == segNumber) {
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];

        lastSegementAngle = Math.atan2(dx, dy);
      }
      segCounter += 1;
    });

    const styles = [lineStyle];
    const lineEnd = clippedLine.getLastCoordinate();
    const lineStart = clippedLine.getFirstCoordinate();

    styles.push(
      new olStyleStyle({
        geometry: new olGeomPoint(lineStart),
        image: new olStyleRegularShape({
          fill: new olStyleFill({
            color: 'rgba(255, 0, 0, 1)'
          }),
          stroke: new olStyleStroke({
            color: 'rgba(255,0,0,1)',
            width: 1,
            lineCap: 'square'
          }),
          points: 3,
          radius: 5,
          rotation: firstSegmentAngle,
          angle: Math.PI / 3
        })
      }),
      new olStyleStyle({
        geometry: new olGeomPoint(lineEnd),
        image: new olStyleRegularShape({
          fill: new olStyleFill({
            color: 'rgba(255, 0, 0, 1)'
          }),
          stroke: new olStyleStroke({
            color: 'rgba(255,0,0,1)',
            width: 1,
            lineCap: 'square'
          }),
          points: 3,
          radius: 5,
          rotation: lastSegementAngle,
          angle: (4 * Math.PI) / 3
        })
      })
    );

    return {
      clippedLine: clippedLine.getCoordinates(),
      distanceOffset: dLeft,
      bufferGeom: feat,
      bufferStyle: styles
    };
  }

  /**
   * Get a Level Of Details and with for a given chart span
   * Configuration is set up in Pytree configuration
   * @param span domain extent
   * @param max_levels levels defined by a LIDAR server
   * @returns Object with optimized Level Of Details and width for this profile span
   */
  getNiceLOD(span: number, max_levels: LidarProfileServerConfigLevels): NiceLOD {
    let maxLOD = 0;
    let width = 0;
    for (const key in max_levels) {
      const level = parseInt(key, 10);
      const max = max_levels[level].max ?? 0;
      if (span < level && max > maxLOD) {
        maxLOD = max;
        width = max_levels[level].width ?? 0;
      }
    }
    return {
      maxLOD,
      width
    };
  }

  /**
   * Create a image file by combining SVG and canvas elements and let the user downloads it.
   *
   * @param profileClientConfig The profile client configuration.
   */
  downloadProfileAsImageFile(profileClientConfig: LidarProfileClientConfig): void {
    const profileSVG = d3select(getLidarProfileSvg() as BaseType);
    const w = parseInt(profileSVG.attr('width'), 10);
    const h = parseInt(profileSVG.attr('height'), 10);
    const margin = profileClientConfig.margin;

    // Create a new canvas element to avoid manipulate the one with profile.
    const canvas = document.createElement('canvas');
    canvas.style.display = 'none';
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Missing ctx');
    }
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, h);

    // Draw the profile canvas (the points) into the new canvas.
    const profileCanvas = d3select(getLidarProfileCanvas() as BaseType);
    const profileCanvasEl = profileCanvas.node();
    ctx.drawImage(profileCanvasEl as CanvasImageSource, margin?.left ?? 0, margin?.top ?? 0);

    // Add transforms the profile into an image.
    const exportImage = new Image();
    const serializer = new XMLSerializer();
    const profileSVGEl =
      /**
       * @type {HTMLElement}
       */ profileSVG.node();
    const svgStr = serializer.serializeToString(profileSVGEl as Node);

    // Draw the image of the profile into the context of the new canvas.
    const img_id = 'lidare_profile_for_export_uid';
    exportImage.id = img_id;
    const buffer = Buffer.from(svgStr);
    exportImage.src = `data:image/svg+xml;base64, ${buffer.toString('base64')}`;
    exportImage.style.setProperty('display', 'none');
    const body = document.getElementsByTagName('body')[0];
    // The image must be loaded to be drawn.
    exportImage.onload = () => {
      ctx.drawImage(exportImage, 0, 0, w, h);
      const elImg = document.getElementById(img_id);
      if (!elImg) {
        throw new Error('Missing elImg');
      }
      body.removeChild(elImg);
      // Let the user download the image.
      canvas.toBlob((blob) => {
        if (!blob) {
          window.alert(I18nManager.getInstance().getTranslation('No graph to export in PNG!'));
          return;
        }
        saveAs(blob, 'LIDAR_profile.png');
      });
    };
    body.appendChild(exportImage);
  }

  /**
   * Transforms a lidarProfile into multiple single points sorted by distance.
   *
   * @param points in the profile
   * @returns An array of LIDAR Points.
   */
  getFlatPointsByDistance(points: LidarProfilePoints): LidarPoint[] {
    const allPoints = [];
    const pDistance = points.distance ?? [];
    const pAltitude = points.altitude ?? [];
    const pColorPacked = points.color_packed ?? [];
    const pIntensity = points.intensity ?? [];
    const pClassification = points.classification ?? [];
    const pCoords = points.coords ?? [];
    for (let i = 0; i < pDistance.length; i++) {
      const p = {
        distance: pDistance[i],
        altitude: pAltitude[i],
        color_packed: pColorPacked[i],
        intensity: pIntensity[i],
        classification: pClassification[i],
        coords: pCoords[i]
      };
      allPoints.push(p);
    }
    allPoints.sort((a, b) => a.distance - b.distance);
    return allPoints;
  }

  /**
   * Get the data for a CSV export of the profile.
   *
   * @param points A list of lidar profile point objects.
   * @returns Objects for a csv export (column: value).
   */
  getCSVData(points: LidarPoint[]): { [key: string]: string | number }[] {
    return points.map((point: LidarPoint) => {
      const row: { [key: string]: string | number } = {};
      Object.keys(point).forEach((key) => {
        if (key === 'altitude') {
          const value = point?.altitude;
          row[key] = value ? value.toFixed(4) : NaN;
        } else if (key === 'color_packed') {
          row[key] = (point.color_packed ?? []).join(' ');
        } else if (key === 'coords') {
          row[key] = (point.coords ?? []).join(' ');
        } else {
          row[key] = (point as Record<string, number | string>)[key];
        }
      });
      return row;
    });
  }

  /**
   * Find the maximum value in an array of numbers
   *
   * @param array of number
   * @returns the maximum of input array
   */
  arrayMax(array: number[]): number {
    return array.reduce((a, b) => Math.max(a, b), 0);
  }

  /**
   * Find the minimum value in am array of numbers
   *
   * @param array of number
   * @returns the minimum of input array
   */
  arrayMin(array: number[]): number {
    let minVal = Infinity;
    for (const element of array) {
      if (element < minVal) {
        minVal = element;
      }
    }
    return minVal;
  }

  /**
   * Transform OpenLayers linestring into a cPotree compatible definition
   *
   * @param line the profile 2D line
   * @returns linestring in a cPotree/pytree compatible string definition
   */
  getPytreeLinestring(line: olGeomLineString): string {
    const coords = line.getCoordinates();
    let pytreeLineString = '';
    for (const coord of coords) {
      const px = coord[0];
      const py = coord[1];
      pytreeLineString += `{${Math.round(100 * px) / 100}, ${Math.round(100 * py) / 100}},`;
    }
    return pytreeLineString.substring(0, pytreeLineString.length - 1);
  }

  /**
   * Find the profile's closest point in profile data to the chart mouse position
   *
   * @param points Object containing points properties as arrays
   * @param xs mouse x coordinate on canvas element
   * @param ys mouse y coordinate on canvas element
   * @param tolerance snap sensibility
   * @param sx d3.scalelinear x scale
   * @param sy d3.scalelinear y scale
   * @param classification_colors
   *    classification colors
   * @returns closestPoint the closest point to the clicked coordinates
   */
  getClosestPoint(
    points: LidarProfilePoints,
    xs: number,
    ys: number,
    tolerance: number,
    sx: d3.ScaleLinear<number, number>,
    sy: d3.ScaleLinear<number, number>,
    classification_colors: LidarProfileServerConfigClassifications
  ): undefined | LidarPoint {
    const tol = tolerance;
    const allDistances = [];
    const hP = [];
    const pDistance = points.distance ?? [];
    const pAltitude = points.altitude ?? [];
    const pColorPacked = points.color_packed ?? [];
    const pIntensity = points.intensity ?? [];
    const pClassification = points.classification ?? [];
    const pCoords = points.coords ?? [];

    for (let i = 0; i < pDistance.length; i++) {
      if (
        sx(pDistance[i]) < xs + tol &&
        sx(pDistance[i]) > xs - tol &&
        sy(pAltitude[i]) < ys + tol &&
        sy(pAltitude[i]) > ys - tol
      ) {
        const distance = Math.sqrt(Math.pow(sx(pDistance[i]) - xs, 2) + Math.pow(sy(pAltitude[i]) - ys, 2));
        const classification = classification_colors[pClassification[i]];
        if (classification && classification.visible == 1) {
          hP.push({
            distance: pDistance[i],
            altitude: pAltitude[i],
            classification: pClassification[i],
            color_packed: pColorPacked[i],
            intensity: pIntensity[i],
            coords: pCoords[i]
          });
          allDistances.push(distance);
        }
      }
    }

    let closestPoint = null;

    if (hP.length > 0) {
      const minDist = Math.min(...allDistances);
      const indexMin = allDistances.indexOf(minDist);
      if (indexMin != -1) {
        closestPoint = hP[indexMin];
      } else {
        closestPoint = hP[0];
      }
    }
    return closestPoint ?? undefined;
  }
}
