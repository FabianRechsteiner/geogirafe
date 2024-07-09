import type { LidarProfileConfig } from './profileconfig';
import type { LidarProfilePoints } from './utils';
import LidarProfileUtils from './utils';
import LidarProfilePlot from './plot';
import LidarProfileMeasure from './measure';
import { debounce } from '../../../tools/utils/debounce';
import I18nManager from '../../../tools/i18n/i18nmanager';

import olLayerVector from 'ol/layer/Vector';
import olOverlay from 'ol/Overlay';
import olSourceVector from 'ol/source/Vector';
import olStyleFill from 'ol/style/Fill';
import olStyleCircle from 'ol/style/Circle';
import olStyleStyle from 'ol/style/Style';
import { type BaseType, select as d3select } from 'd3';

import type OlMap from 'ol/Map';
import type OlOverlay from 'ol/Overlay';
import type OlLayerVector from 'ol/layer/Vector';
import type OlSourceVector from 'ol/source/Vector';
import type OlGeomGeometry from 'ol/geom/Geometry';
import type OlGeomLineString from 'ol/geom/LineString';
import type { Coordinate as OlCoordinateCoordinate } from 'ol/coordinate';
import type OlFeature from 'ol/Feature';
import {
  getLidarProfileCanvas,
  getLidarProfileError,
  getLidarProfileLodInfo,
  getLidarProfileWidthInfo
} from './domselector';

export class LidarProfileManager {
  plot: LidarProfilePlot | null;
  measure: LidarProfileMeasure | null;
  config: LidarProfileConfig | null;

  /**
   * The hovered point attributes in D3 profile highlighted on the 2D map
   */
  cartoHighlight: OlOverlay;

  /**
   * The hovered point geometry (point) in D3 profile highlighted on the 2D map
   */
  lidarPointHighlight: OlLayerVector<OlSourceVector<OlFeature>>;

  /**
   * The profile footpring represented as a LineString represented
   * with real mapunites stroke width
   */
  lidarBuffer: OlLayerVector<OlSourceVector<OlFeature>>;

  /**
   * The variable where all points of the profile are stored
   */
  profilePoints: LidarProfilePoints;

  private isPlotSetup: boolean;
  private line: OlGeomLineString | null;
  private i18nManager: I18nManager;

  utils: LidarProfileUtils;

  debouncer = debounce(() => this.updateData_(), 200);
  /**
   * Provides a service to manage a D3js component to be used to draw an lidar point cloud profile chart.
   * Requires access to a Pytree webservice: https://github.com/sitn/pytree
   */
  constructor() {
    this.i18nManager = I18nManager.getInstance();
    this.plot = null;
    this.measure = null;
    this.config = null;
    this.line = null;
    this.isPlotSetup = false;
    this.utils = new LidarProfileUtils();

    /**
     * The hovered point attributes in D3 profile highlighted on the 2D map
     */
    this.cartoHighlight = new olOverlay({
      offset: [0, -15],
      positioning: 'bottom-center'
    });

    /**
     * The hovered point geometry (point) in D3 profile highlighted on the 2D map
     */
    this.lidarPointHighlight = new olLayerVector({
      className: 'canvas2d',
      source: new olSourceVector({}),
      style: new olStyleStyle({
        image: new olStyleCircle({
          fill: new olStyleFill({
            color: 'rgba(0, 0, 255, 1)'
          }),
          radius: 3
        })
      })
    });

    /**
     * The profile footpring represented as a LineString represented
     * with real mapunites stroke width
     */
    this.lidarBuffer = new olLayerVector({
      className: 'canvas2d',
      source: new olSourceVector({})
    });

    /**
     * The variable where all points of the profile are stored
     */
    this.profilePoints = this.getEmptyProfilePoints_();
  }

  /**
   * @param config Config
   * @param map The map.
   */
  init(config: LidarProfileConfig, map: OlMap): void {
    this.config = config;
    this.plot = new LidarProfilePlot(this);
    this.measure = new LidarProfileMeasure(this);
    this.setMap(map);
  }

  /**
   * Clears the profile footprint
   */
  clearBuffer(): void {
    if (this.lidarBuffer) {
      /**
       * @type {olSourceVector<OlGeomLineString>}
       */ this.lidarBuffer.getSource()?.clear();
    }
  }

  /**
   * Set the line for the profile
   *
   * @param line that defines the profile
   */
  setLine(line: null | OlGeomLineString): void {
    this.line = line;
  }

  /**
   * Set the map used by the profile
   *
   * @param map The map.
   */
  setMap(map: OlMap): void {
    this.cartoHighlight.setMap(map);
    this.lidarPointHighlight.setMap(map);
    this.lidarBuffer.setMap(map);
  }

  /**
   * @returns An empty lidarProfile points object.
   * @private
   */
  getEmptyProfilePoints_(): LidarProfilePoints {
    return {
      distance: [],
      altitude: [],
      color_packed: [],
      intensity: [],
      classification: [],
      coords: []
    };
  }

  /**
   * Load profile data (lidar points) by successive Levels Of Details using asynchronous requests
   *
   * @param clippedLine an array of the clipped line coordinates
   * @param distanceOffset the left side of D3 profile domain at current zoom and pan configuration
   * @param resetPlot whether to reset D3 plot or not
   * @param minLOD minimum Level Of Detail
   */
  getProfileByLOD(
    clippedLine: OlCoordinateCoordinate[],
    distanceOffset: number,
    resetPlot: boolean,
    minLOD: number
  ): void {
    if (!this.config) {
      throw new Error('Missing config');
    }
    if (!this.plot) {
      throw new Error('Missing plot');
    }
    if (!this.line) {
      throw new Error('Missing line');
    }
    if (!this.config.serverConfig) {
      throw new Error('Missing config.serverConfig');
    }

    this.profilePoints = this.getEmptyProfilePoints_();

    if (resetPlot) {
      this.isPlotSetup = false;
    }

    d3select(getLidarProfileError() as BaseType).style('visibility', 'hidden');
    let pytreeLinestring = this.utils.getPytreeLinestring(this.line);

    let maxLODWith;
    const max_levels = this.config.serverConfig.max_levels ?? [];
    if (distanceOffset == 0) {
      maxLODWith = this.utils.getNiceLOD(this.line.getLength(), max_levels);
    } else {
      const domain = this.plot.updateScaleX.domain();
      pytreeLinestring = '';

      for (const clipped of clippedLine) {
        pytreeLinestring += `{${clipped[0]},${clipped[1]}},`;
      }
      pytreeLinestring = pytreeLinestring.substring(0, pytreeLinestring.length - 1);
      maxLODWith = this.utils.getNiceLOD(domain[1] - domain[0], max_levels);
    }

    d3select(getLidarProfileLodInfo() as BaseType).html('');
    this.config.clientConfig.pointSum = 0;
    const profileWidth = this.config.clientConfig.autoWidth ? maxLODWith.width : this.config.serverConfig.width ?? 0;

    const profileWidthTxt = this.i18nManager.getTranslation('Profile width: ');
    d3select(getLidarProfileWidthInfo() as BaseType).html(`${profileWidthTxt} ${profileWidth}m`);
    const initialLOD = this.config.serverConfig.initialLOD ?? 0;

    for (let i = 0; i < maxLODWith.maxLOD; i++) {
      if (i == 0) {
        this.queryPytree(minLOD, initialLOD, i, pytreeLinestring, distanceOffset, profileWidth, resetPlot);
        i += initialLOD - 1;
      } else if (i < maxLODWith.maxLOD - 1) {
        this.queryPytree(minLOD + i, minLOD + i + 1, i, pytreeLinestring, distanceOffset, profileWidth, false);
      } else {
        this.queryPytree(minLOD + i, minLOD + i + 1, i, pytreeLinestring, distanceOffset, profileWidth, false);
      }
    }
  }

  /**
   * Request to Pytree service for a range of Level Of Detail (LOD)
   *
   * @param minLOD minimum Level Of Detail of the request
   * @param maxLOD maximum Level Of Detail of the request
   * @param iter the iteration in profile requests cycle
   * @param coordinates linestring in cPotree format
   * @param distanceOffset the left side of D3 profile domain at current zoom and pan configuration
   * @param width the width of the profile
   * @param resetPlot whether to reset D3 plot or not, used for first LOD
   * @private
   */
  private queryPytree(
    minLOD: number,
    maxLOD: number,
    iter: number,
    coordinates: string,
    distanceOffset: number,
    width: number,
    resetPlot: boolean
  ): void {
    if (!this.config) {
      throw new Error('Missing config');
    }
    if (!this.config.serverConfig) {
      throw new Error('Missing config.serverConfig');
    }

    const lodInfo = d3select(getLidarProfileLodInfo() as BaseType);
    if (this.config.serverConfig.debug) {
      let html = lodInfo.html();
      const loadingLodTxt = this.i18nManager.getTranslation('Loading LOD: ');
      html += `${loadingLodTxt} ${minLOD}-${maxLOD}..<br>`;
      lodInfo.html(html);
    }

    const pointCloudName = this.config.serverConfig.default_point_cloud;
    const hurl = `${this.config.pytreeLidarProfileJsonUrl}/profile/get?minLOD=${minLOD}&maxLOD=${maxLOD}&width=${width}&coordinates=${coordinates}&pointCloud=${pointCloudName}&attributes=`;

    const options = {
      method: 'GET',
      headers: { 'Content-Type': 'text/plain; charset=x-user-defined' },
      responseType: 'arraybuffer'
    };

    fetch(hurl, options)
      .then((resp: Response) => resp.arrayBuffer())
      .then((data: ArrayBuffer) => {
        if (!this.config) {
          throw new Error('Missing config');
        }
        if (!this.config.serverConfig) {
          throw new Error('Missing config.serverConfig');
        }
        if (this.config.serverConfig.debug) {
          let html = lodInfo.html();
          const lodTxt = this.i18nManager.getTranslation('LOD: ');
          const loadedTxt = this.i18nManager.getTranslation('loaded');
          html += `${lodTxt} ${minLOD}-${maxLOD} ${loadedTxt}<br>`;
          lodInfo.html(html);
        }
        this.processBuffer(data, iter, distanceOffset, resetPlot);
      })
      .catch((err: Error) => {
        throw new Error(`Error on pytree query: ${err.message}`);
      });
  }

  /**
   * Process the binary array return by Pytree (cPotree)
   *
   * @param profile binary array returned by cPotree executable called by Pytree
   * @param iter the iteration in profile requests cycle
   * @param distanceOffset the left side of D3 profile domain at current zoom and pan configuration
   * @param resetPlot whether to reset D3 plot or not
   * @private
   */
  private processBuffer(profile: ArrayBuffer, iter: number, distanceOffset: number, resetPlot: boolean): void {
    if (!this.config) {
      throw new Error('Missing config');
    }
    if (!this.config.serverConfig) {
      throw new Error('Missing config.serverConfig');
    }
    if (!this.plot) {
      throw new Error('Missing plot');
    }
    if (!this.line) {
      throw new Error('Missing line');
    }

    const lidarError = d3select(getLidarProfileError() as BaseType);

    const typedArrayInt32 = new Int32Array(profile, 0, 4);
    const headerSize = typedArrayInt32[0];

    const uInt8header = new Uint8Array(profile, 4, headerSize);
    let strHeaderLocal = '';
    for (const header of uInt8header) {
      strHeaderLocal += String.fromCharCode(header);
    }

    try {
      JSON.parse(strHeaderLocal);
    } catch (e) {
      if (!this.isPlotSetup) {
        const canvas = d3select(getLidarProfileCanvas() as BaseType);
        const canvasEl = canvas.node() as HTMLCanvasElement | undefined;
        const ctx = canvasEl?.getContext('2d');
        if (!ctx || !canvasEl) {
          throw new Error('Missing ctx or canvas element.');
        }
        ctx.clearRect(0, 0, canvasEl.getBoundingClientRect().width, canvasEl.getBoundingClientRect().height);
        canvas.selectAll('*').remove();
        const errorTxt = this.getHTMLError_();
        lidarError.style('visibility', 'visible');
        lidarError.html(errorTxt);
      }
      return;
    }

    lidarError.style('visibility', 'hidden');

    const jHeader = JSON.parse(strHeaderLocal);

    // If number of points return is higher than Pytree configuration max value,
    // stop sending requests.
    const pointSum = (this.config.clientConfig.pointSum ?? 0) + jHeader.points;
    if (pointSum > (this.config.serverConfig.max_point_number ?? 0)) {
      console.warn('Number of points is higher than Pytree configuration max value !');
    }

    const attr = jHeader.pointAttributes;
    const attributes = [];
    const pointAttributes = this.config.serverConfig.point_attributes ?? {};
    for (const att of attr) {
      if (pointAttributes[att] != undefined) {
        attributes.push(pointAttributes[att]);
      }
    }
    const scale: number = jHeader.scale;

    if (jHeader.points < 3) {
      return;
    }

    const points = this.getEmptyProfilePoints_();
    const bytesPerPoint = jHeader.bytesPerPoint;
    const buffer = profile.slice(4 + headerSize);
    const profileDistance = this.profilePoints.distance ?? [];
    const profileClassification = this.profilePoints.classification ?? [];
    const profileIntensity = this.profilePoints.intensity ?? [];
    const profileColorPacked = this.profilePoints.color_packed ?? [];
    const profileAltitude = this.profilePoints.altitude ?? [];
    const profileCoords = this.profilePoints.coords ?? [];
    const pDistance = points.distance ?? [];
    const pClassification = points.classification ?? [];
    const pIntensity = points.intensity ?? [];
    const pColorPacked = points.color_packed ?? [];
    const pAltitude = points.altitude ?? [];
    const pCoords = points.coords ?? [];
    for (let i = 0; i < jHeader.points; i++) {
      const byteOffset = bytesPerPoint * i;
      const view = new DataView(buffer, byteOffset, bytesPerPoint);
      let aoffset = 0;
      for (const attribute of attributes) {
        if (attribute.value == 'POSITION_PROJECTED_PROFILE') {
          const udist = view.getUint32(aoffset, true);
          const dist = udist * scale;
          const distance = Math.round(100 * (distanceOffset + dist)) / 100;
          pDistance.push(distance);
          profileDistance.push(distance);
        } else if (attribute.value == 'CLASSIFICATION') {
          const classif = view.getUint8(aoffset);
          pClassification.push(classif);
          profileClassification.push(classif);
        } else if (attribute.value == 'INTENSITY') {
          const intensity = view.getUint8(aoffset);
          pIntensity.push(intensity);
          profileIntensity.push(intensity);
        } else if (attribute.value == 'COLOR_PACKED') {
          const r = view.getUint8(aoffset);
          const g = view.getUint8(aoffset + 1);
          const b = view.getUint8(aoffset + 2);
          pColorPacked.push([r, g, b]);
          profileColorPacked.push([r, g, b]);
        } else if (attribute.value == 'POSITION_CARTESIAN') {
          const lx = jHeader.boundingBox.lx;
          if (typeof lx != 'number') {
            throw new Error('Wrong lx type');
          }
          const ly = jHeader.boundingBox.ly;
          if (typeof ly != 'number') {
            throw new Error('Wrong ly type');
          }
          const lz = jHeader.boundingBox.lz;
          if (typeof lz != 'number') {
            throw new Error('Wrong lz type');
          }
          const x = view.getInt32(aoffset, true) * scale + lx;
          const y = view.getInt32(aoffset + 4, true) * scale + ly;
          const z = view.getInt32(aoffset + 8, true) * scale + lz;
          pCoords.push([x, y]);
          pAltitude.push(z);
          profileAltitude.push(z);
          profileCoords.push([x, y]);
        }
        aoffset = aoffset + (attribute.bytes ?? 0);
      }
    }

    const rangeX = [0, this.line.getLength()];

    const rangeY = [this.utils.arrayMin(pAltitude), this.utils.arrayMax(pAltitude)];

    if ((iter == 0 && resetPlot) || !this.isPlotSetup) {
      this.plot.setupPlot(rangeX, rangeY);
      this.isPlotSetup = true;
    }
    this.plot.drawPoints(points);
  }

  /**
   * @returns The html for errors.
   * @private
   */
  getHTMLError_(): string {
    const errorInfoTxt = this.i18nManager.getTranslation('LiDAR profile service error');
    const errorOfflineTxt = this.i18nManager.getTranslation('It might be offline');
    const errorOutsideTxt = this.i18nManager.getTranslation(
      'Or did you attempt to draw a profile outside data extent?'
    );
    const errorNoPointError = this.i18nManager.getTranslation(
      'Or did you attempt to draw such a small profile that no point was returned?'
    );
    return `
      <div class="lidarprofile-error">
      <p class="bold">${errorInfoTxt}</p>
      <p>${errorOfflineTxt}</p>
      <p>${errorOutsideTxt}</p>
      <p>${errorNoPointError}</p>
    `;
  }

  /**
   * Update the profile data according to D3 chart zoom and pan level
   * The update will wait on a 200ms pause on the actions of users before to do the update.
   */
  updateData(): void {
    this.debouncer();
  }

  /**
   * Callback method used by the debouncer to update the profile data
   *
   * @private
   */
  updateData_(): void {
    if (!this.config) {
      throw new Error('Missing config');
    }
    if (!this.config.serverConfig) {
      throw new Error('Missing config.serverConfig');
    }
    if (!this.plot) {
      throw new Error('Missing plot');
    }
    if (!this.line) {
      throw new Error('Missing line');
    }
    const domainX = this.plot.updateScaleX.domain();
    const clip = this.utils.clipLineByMeasure(this.line, domainX[0], domainX[1]);

    const source: olSourceVector<OlFeature<OlGeomGeometry>> | null = this.lidarBuffer.getSource();
    if (!source) {
      console.error('No source to update data.');
      return;
    }
    source.clear();
    source.addFeature(clip.bufferGeom);
    this.lidarBuffer.setStyle(clip.bufferStyle);

    const span = domainX[1] - domainX[0];
    const maxLODWidth = this.utils.getNiceLOD(span, this.config.serverConfig.max_levels ?? []);
    const xTolerance = 0.2;

    if (
      Math.abs(domainX[0] - this.plot.previousDomainX[0]) < xTolerance &&
      Math.abs(domainX[1] - this.plot.previousDomainX[1]) < xTolerance
    ) {
      this.plot.drawPoints(this.profilePoints);
    } else if (maxLODWidth.maxLOD <= (this.config.serverConfig.initialLOD ?? 0)) {
      this.plot.drawPoints(this.profilePoints);
    } else {
      this.getProfileByLOD(clip.clippedLine, clip.distanceOffset, false, 0);
    }

    this.plot.previousDomainX = domainX;
  }
}

const lidarProfileManager = new LidarProfileManager();
export default lidarProfileManager;
