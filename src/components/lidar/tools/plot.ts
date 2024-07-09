import olFeature from 'ol/Feature';
import olGeomPoint from 'ol/geom/Point';
import olStyleCircle from 'ol/style/Circle';
import olStyleFill from 'ol/style/Fill';
import olStyleStyle from 'ol/style/Style';
import {
  axisBottom as d3axisBottom,
  axisLeft as d3axisLeft,
  scaleLinear as d3scaleLinear,
  pointer as d3pointer,
  select as d3select,
  zoom as d3zoom,
  type BaseType,
  type D3ZoomEvent
} from 'd3';

import { LidarProfileManager } from './manager';
import { LidarProfilePoints, LidarPoint } from './utils';
import { LidarProfileServerConfigClassification, LidarProfileServerConfigClassifications } from './profileconfig';
import I18nManager from '../../../tools/i18n/i18nmanager';
import { getLidarProfileCanvas, getLidarProfileContainer, getLidarProfileSvg } from './domselector';

export default class {
  /**
   * d3.scaleLinear X scale.
   */
  scaleX: d3.ScaleLinear<number, number> | null;

  /**
   * d3.scaleLinear X scale.
   */
  updateScaleX: d3.ScaleLinear<number, number>;

  /**
   * d3.scaleLinear Y scale.
   */
  scaleY: d3.ScaleLinear<number, number> | null;

  /**
   * d3.scaleLinear Y scale.
   */
  updateScaleY: d3.ScaleLinear<number, number>;

  /**
   * The material used for the drawing process. Initialized in the setup
   */
  material: string | null;

  previousDomainX: number[];

  private manager: LidarProfileManager;
  private width: number;
  private height: number;
  private moved: boolean;
  private i18nManager: I18nManager;

  /**
   * Provides a service to create an SVG element with defined axis and a LIDAR
   * point drawing mechanism.
   *
   * @param LidarProfileManagerInstance
   *    gmf lidar profile manager instance
   */
  constructor(LidarProfileManagerInstance: LidarProfileManager) {
    this.i18nManager = I18nManager.getInstance();
    this.manager = LidarProfileManagerInstance;

    /**
     * d3.scaleLinear X scale.
     */
    this.scaleX = null;

    /**
     * d3.scaleLinear X scale.
     *
     * @param x .
     * @returns x .
     */
    // @ts-expect-error TODO SMS: Check this when extending the functionalities of the LIDAR component
    this.updateScaleX = (x: number) => x;

    /**
     * d3.scaleLinear Y scale.
     */
    this.scaleY = null;

    /**
     * d3.scaleLinear Y scale.
     *
     * @param y .
     * @returns y .
     */
    // @ts-expect-error TODO SMS: Check this when extending the functionalities of the LIDAR component
    this.updateScaleY = (y) => y;

    /**
     * The material used for the drawing process. Initialized in the setup
     */
    this.material = null;
    this.width = 0;
    this.height = 0;
    this.previousDomainX = [];
    this.moved = false;
  }

  /**
   * Draw the points to the canvas element
   *
   * @param points of the profile
   */
  drawPoints(points: LidarProfilePoints): void {
    if (!this.manager.config) {
      throw new Error('Missing manager.config');
    }
    if (!this.manager.config.serverConfig) {
      throw new Error('Missing manager_.config.serverConfig');
    }
    let i = -1;
    const nPoints = points.distance?.length ?? 0;
    let cx, cy;
    const canvas = d3select(getLidarProfileCanvas() as BaseType);
    const canvasEl = canvas?.node() as HTMLCanvasElement | undefined;
    const ctx = canvasEl?.getContext('2d');
    if (!ctx) {
      throw new Error('Missing ctx');
    }
    const profileServerConfig = this.manager.config.serverConfig;

    const pDistance = points.distance ?? [];
    const pAltitude = points.altitude ?? [];
    const pColorPacked = points.color_packed ?? [];
    const pIntensity = points.intensity ?? [];
    const pClassification = points.classification ?? [];

    while (++i < nPoints) {
      const distance = pDistance[i];
      const altitude = pAltitude[i];
      const rgb = pColorPacked[i];
      const intensity = pIntensity[i];
      const classification = pClassification[i];
      if (profileServerConfig?.classification_colors?.[classification]?.visible) {
        cx = this.updateScaleX(distance);
        cy = this.updateScaleY(altitude);

        ctx.beginPath();
        ctx.moveTo(cx, cy);

        if (this.material == 'COLOR_PACKED') {
          ctx.fillStyle = `RGB(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        } else if (this.material == 'INTENSITY') {
          ctx.fillStyle = `RGB(${intensity}, ${intensity}, ${intensity})`;
        } else if (this.material == 'CLASSIFICATION') {
          ctx.fillStyle = `RGB(${profileServerConfig.classification_colors[classification].color})`;
        } else {
          ctx.fillStyle = profileServerConfig.default_color ?? '';
        }
        ctx.arc(cx, cy, profileServerConfig.point_size ?? 0, 0, 2 * Math.PI, false);
        ctx.fill();
      }
    }
  }

  /**
   * Setup the SVG components of the D3 chart
   *
   * @param rangeX range of the x scale
   * @param rangeY range of the y scale
   */
  setupPlot(rangeX: number[], rangeY: number[]): void {
    if (!this.manager.config) {
      throw new Error('Missing manager.config');
    }
    if (!this.manager.config.serverConfig) {
      throw new Error('Missing manager_.config.serverConfig');
    }
    const canvas = d3select(getLidarProfileCanvas() as BaseType);
    const canvasEl: HTMLCanvasElement | undefined = canvas?.node() as HTMLCanvasElement | undefined;
    const ctx = canvasEl?.getContext('2d');
    if (!ctx || !canvasEl) {
      throw new Error('Missing ctx or canvas element');
    }
    ctx.clearRect(0, 0, canvasEl.getBoundingClientRect().width, canvasEl.getBoundingClientRect().height);

    const margin = this.manager.config.clientConfig.margin;
    const element = getLidarProfileContainer();
    const container = d3select(element as BaseType);
    const containerEl = container?.node() as HTMLCanvasElement | undefined;
    const containerWidth = containerEl?.getBoundingClientRect().width ?? 0;
    const containerHeight = containerEl?.getBoundingClientRect().height ?? 0;
    this.width = containerWidth - (margin.left + margin.right);
    this.height = containerHeight - (margin.top + margin.bottom);

    this.material = this.manager.config.serverConfig.default_attribute ?? '';

    canvas
      .attr('height', this.height)
      .attr('width', this.width)
      .style('background-color', 'black')
      .style('z-index', 0)
      .style('position', 'absolute')
      .style('margin-left', `${margin.left.toString()}px`)
      .style('margin-top', `${margin.top.toString()}px`);

    const domainProfileWidth = rangeX[1] - rangeX[0];
    const domainProfileHeight = rangeY[1] - rangeY[0];
    const domainRatio = domainProfileWidth / domainProfileHeight;
    const rangeProfileWidth = this.width;
    const rangeProfileHeight = this.height;
    const rangeRatio = rangeProfileWidth / rangeProfileHeight;

    let domainScale;
    if (domainRatio < rangeRatio) {
      const domainScale = rangeRatio / domainRatio;
      const domainScaledWidth = domainProfileWidth * domainScale;
      this.scaleX = d3scaleLinear();
      this.scaleX.domain([0, domainScaledWidth]);
      this.scaleX.range([0, this.width]);
      this.scaleY = d3scaleLinear();
      this.scaleY.domain(rangeY);
      this.scaleY.range([this.height, 0]);
    } else {
      domainScale = domainRatio / rangeRatio;
      const domainScaledHeight = domainProfileHeight * domainScale;
      const domainHeightCentroid = (rangeY[1] + rangeY[0]) / 2;
      this.scaleX = d3scaleLinear();
      this.scaleX.domain(rangeX);
      this.scaleX.range([0, this.width]);
      this.scaleY = d3scaleLinear();
      this.scaleY.domain([
        domainHeightCentroid - domainScaledHeight / 2,
        domainHeightCentroid + domainScaledHeight / 2
      ]);
      this.scaleY.range([this.height, 0]);
    }

    const zoom = d3zoom()
      .scaleExtent([-10, 100])
      .translateExtent([
        [0, 0],
        [this.width, this.height]
      ])
      .extent([
        [0, 0],
        [this.width, this.height]
      ])
      .on('zoom', (event) => this.zoomed(event));

    zoom.on('end', (event) => this.zoomEnd(event));

    this.previousDomainX = this.scaleX.domain();
    this.updateScaleX = this.scaleX;
    this.updateScaleY = this.scaleY;

    const svg = d3select(getLidarProfileSvg() as BaseType);

    // @ts-expect-error TODO SMS: Check this when extending the functionalities of the LIDAR component
    svg.call(zoom).on('dblclick.zoom', null);

    svg.selectAll('*').remove();

    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    svg.attr('width', this.width + margin.left).attr('height', this.height + margin.top + margin.bottom);

    svg.on('mousemove', (event: MouseEvent) => {
      this.pointHighlight(event);
    });

    const xAxis = d3axisBottom(this.scaleX);
    const yAxis = d3axisLeft(this.scaleY).tickSize(-this.width);

    svg.select('.y.axis').selectAll('g.tick line').style('stroke', '#b7cff7');
    svg.append('g').attr('class', 'y axis').call(yAxis);
    svg.append('g').attr('class', 'x axis').call(xAxis);
    svg.select('.y.axis').attr('transform', `translate(${margin.left}, ${margin.top})`);
    svg.select('.x.axis').attr('transform', `translate(${margin.left}, ${this.height + margin.top})`);
    svg.select('.y.axis').selectAll('g.tick line').style('opacity', '0.5').style('stroke', '#b7cff7');
  }

  /**
   * Update the plot data at the end of the zoom process
   *
   * @param event Event .
   */
  zoomEnd(event: D3ZoomEvent<Element, unknown>): void {
    if (event.sourceEvent && this.moved === false) {
      this.manager.updateData();
      return;
    }
    this.moved = false;
    const element = getLidarProfileCanvas();
    const canvas = d3select(element as BaseType);
    const canvasEl = canvas?.node() as HTMLCanvasElement | undefined;
    const ctx = canvasEl?.getContext('2d');
    if (!ctx) {
      throw new Error('Missing ctx');
    }
    ctx.clearRect(0, 0, this.width, this.height);
    this.manager.updateData();
  }

  /**
   * Update the plot axis during the zoom process
   *
   * @param event Event .
   */
  zoomed(event: D3ZoomEvent<Element, unknown>): void {
    if (!this.manager.measure) {
      throw new Error('Missing manager.measure');
    }
    if (!this.scaleX) {
      throw new Error('Missing scaleX');
    }
    if (!this.scaleY) {
      throw new Error('Missing scaleY');
    }
    if (event.sourceEvent && event.sourceEvent.type === 'mousemove') {
      this.moved = true;
      if (event.sourceEvent.movementX == 0 && event.sourceEvent.movementY == 0) {
        return;
      }
    }

    this.manager.measure.clearMeasure();

    const tr = event.transform;
    const svg = d3select(getLidarProfileSvg() as BaseType);
    const xAxis = d3axisBottom(this.scaleX);
    const yAxis = d3axisLeft(this.scaleY).tickSize(-this.width);

    const newScaleX = tr.rescaleX(this.scaleX);
    const newScaleY = tr.rescaleY(this.scaleY);

    const xSelect = svg.select('.x.axis');
    const ySelect = svg.select('.y.axis');
    // @ts-expect-error TODO SMS: Check this when extending the functionalities of the LIDAR component
    xSelect.call(xAxis.scale(newScaleX));
    // @ts-expect-error TODO SMS: Check this when extending the functionalities of the LIDAR component
    ySelect.call(yAxis.scale(newScaleY));

    const canvas = d3select(getLidarProfileCanvas() as BaseType);
    const canvasEl = canvas?.node() as HTMLCanvasElement | undefined;
    const ctx = canvasEl?.getContext('2d');
    if (!ctx) {
      throw new Error('Missing ctx');
    }
    ctx.clearRect(0, 0, this.width, this.height);

    svg.select('.y.axis').selectAll('g.tick line').style('opacity', '0.5').style('stroke', '#b7cff7');

    this.updateScaleX = newScaleX;
    this.updateScaleY = newScaleY;
  }

  /**
   * Update the OpenLayers overlay that displays point position and attributes values
   *
   * @param event Event .
   */
  pointHighlight(event: MouseEvent): void {
    if (!this.manager.config) {
      throw new Error('Missing manager.config');
    }
    if (!this.manager.config.serverConfig) {
      throw new Error('Missing manager_.config.serverConfig');
    }

    const lidarContainerElement = getLidarProfileContainer();
    if (!lidarContainerElement) {
      console.error('No container element.');
      return;
    }
    const svg = d3select(lidarContainerElement.querySelector('svg.lidar-svg'));
    const lidarInfo = d3select(lidarContainerElement.querySelector('.lidar-info'));
    const pointSize = this.manager.config.serverConfig.point_size ?? 0;
    const margin = this.manager.config.clientConfig.margin;
    const tolerance = this.manager.config.clientConfig.tolerance ?? 0;

    const canvas = d3select(lidarContainerElement.querySelector('.lidar-canvas'));
    const canvasEl = canvas.node();
    const canvasCoordinates = d3pointer(event, canvasEl);
    const classification_colors = this.manager.config.serverConfig.classification_colors ?? [];

    let cx, cy;
    const p = this.manager.utils.getClosestPoint(
      this.manager.profilePoints,
      canvasCoordinates[0],
      canvasCoordinates[1],
      tolerance,
      this.updateScaleX,
      this.updateScaleY,
      classification_colors
    );

    const source = this.manager.lidarPointHighlight.getSource();
    if (p != undefined) {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      cx = this.updateScaleX(p?.distance ?? 0) + margin.left;
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      cy = this.updateScaleY(p?.altitude ?? 0) + margin.top;

      svg.selectAll('#highlightCircle').remove();

      svg
        .append('circle')
        .attr('id', 'highlightCircle')
        .attr('cx', cx)
        .attr('cy', cy)
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        .attr('r', pointSize + 1)
        .style('fill', 'orange');

      const pClassification = p.classification ?? -1;
      const pointClassification = classification_colors[pClassification] || {};

      const html = this.getInfoHTML(p, pointClassification, 1);

      lidarInfo.html(html);
      this.manager.cartoHighlight.setElement(undefined);
      const el = document.createElement('div');
      el.className += 'tooltip gmf-tooltip-measure';
      el.innerHTML = html;

      const coords = p.coords ?? [];
      this.manager.cartoHighlight.setElement(el);
      this.manager.cartoHighlight.setPosition([coords[0], coords[1]]);
      source?.clear();
      const lidarPointGeom = new olGeomPoint([coords[0], coords[1]]);
      const lidarPointFeature = new olFeature(lidarPointGeom);
      if (pointClassification.color !== undefined) {
        lidarPointFeature.setStyle(
          new olStyleStyle({
            image: new olStyleCircle({
              fill: new olStyleFill({
                color: `rgba(${pointClassification.color}, 1)`
              }),
              radius: 3
            })
          })
        );
      }

      source?.addFeature(lidarPointFeature);
    } else {
      source?.clear();
      svg.select('#highlightCircle').remove();
      lidarInfo.html('');
      this.manager.cartoHighlight.setPosition(undefined);
    }
  }

  /**
   * @param point the concerned point.
   * @param classification_color
   *    the classification object concerning this point.
   * @param distDecimal the number of decimal to keep.
   * @returns the text for the html info.
   */
  getInfoHTML(
    point: LidarPoint,
    classification_color: LidarProfileServerConfigClassification,
    distDecimal: number
  ): string {
    const html = [];
    const distance = point.distance;
    const altitude = point.altitude;
    const classification = this.i18nManager.getTranslation(classification_color.name ?? '');
    const intensity = point.intensity;

    if (distance !== undefined) {
      const distanceTxt = this.i18nManager.getTranslation('Distance: ');
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      html.push(`${distanceTxt + this.formatDecimals(distance, distDecimal)}`);
    }
    if (altitude !== undefined) {
      const altitudeTxt = this.i18nManager.getTranslation('Altitude: ');
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      html.push(`${altitudeTxt + this.formatDecimals(altitude, distDecimal)}`);
    }
    if (classification.length > 0) {
      const classificationTxt = this.i18nManager.getTranslation('Classification: ');
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      html.push(`${classificationTxt + classification}`);
    }
    if (intensity !== undefined) {
      const intensityTxt = this.i18nManager.getTranslation('Intensity: ');
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      html.push(`${intensityTxt + this.formatDecimals(intensity, 0)}`);
    }

    return html.join('</br>');
  }

  formatDecimals(num: number, decimals: number): number {
    return Number((Math.round(num * 100) / 100).toFixed(decimals));
  }

  /**
   * Change the profile style according to the material color
   *
   * @param material value as defined in Pytree attribute configuration
   */
  changeStyle(material: string): void {
    this.material = material;
    const canvas = d3select(getLidarProfileCanvas() as BaseType);
    const canvasEl = canvas?.node() as HTMLCanvasElement | undefined;
    const ctx = canvasEl?.getContext('2d');
    if (!ctx || !canvasEl) {
      throw new Error('Missing ctx or canvas element.');
    }
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    this.drawPoints(this.manager.profilePoints);
  }

  /**
   * Show/Hide classes in the profile
   *
   * @param classification
   *   value as defined in the Pytree classification_colors configuration
   * @param material  value as defined in Pytree attribute configuration
   */
  setClassActive(classification: LidarProfileServerConfigClassifications, material: string): void {
    if (!this.manager.config) {
      throw new Error('Missing manager.config');
    }
    if (!this.manager.config.serverConfig) {
      throw new Error('Missing manager_.config.serverConfig');
    }
    this.manager.config.serverConfig.classification_colors = classification;
    this.changeStyle(material);
  }
}
