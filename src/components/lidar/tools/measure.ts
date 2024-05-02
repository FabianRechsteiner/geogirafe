import { type BaseType, pointer as d3pointer, select as d3select } from 'd3';

import type { LidarProfileManager } from './manager';
import type { LidarPoint } from './utils';
import { getLidarProfileCanvas, getLidarProfileSvg } from './domselector';

export default class {
  private manager: LidarProfileManager;
  private pStart: LidarPoint;
  private pEnd: LidarPoint;

  /**
   * Measure tool for the d3 chart
   */
  constructor(lidarProfileManagerInstance: LidarProfileManager) {
    this.manager = lidarProfileManagerInstance;
    this.pStart = {};
    this.pEnd = {};
  }

  /**
   * Clear the current measure
   */
  clearMeasure(): void {
    this.pStart = {};
    this.pEnd = {};

    const svg = d3select(getLidarProfileSvg() as BaseType);
    svg.selectAll('#text_m').remove();
    svg.selectAll('#start_m').remove();
    svg.selectAll('#end_m').remove();
    svg.selectAll('#line_m').remove();
    svg.on('click', null);
    svg.style('cursor', 'default');
  }

  /**
   * Activate the measure tool
   */
  setMeasureActive(): void {
    const svg = d3select(getLidarProfileSvg() as BaseType);
    svg.style('cursor', 'pointer');
    svg.on('click', (event) => this.measureHeight(event));
  }

  /**
   * Measure and display height after two click on the profile.
   *
   * @param event Event .
   */
  measureHeight(event: MouseEvent): void {
    if (!this.manager.config) {
      throw new Error('Missing manager.config');
    }
    if (!this.manager.plot) {
      throw new Error('Missing manager.plot');
    }
    const svg = d3select(getLidarProfileSvg() as BaseType);
    const svgEl = svg.node();
    const canvas = d3select(getLidarProfileCanvas() as BaseType);
    const canvasEl = canvas.node();

    const svgCoordinates = d3pointer(event, svgEl);
    const canvasCoordinates = d3pointer(event, canvasEl);
    const margin = this.manager.config.clientConfig.margin;
    const xs = svgCoordinates[0];
    const ys = svgCoordinates[1];
    const tolerance = 2;
    const sx = this.manager.plot.updateScaleX;
    const sy = this.manager.plot.updateScaleY;
    const pointSize = 3;
    if (!this.manager.config.serverConfig) {
      throw new Error('Missing manager_.config.serverConfig');
    }
    const p = this.manager.utils.getClosestPoint(
      this.manager.profilePoints,
      canvasCoordinates[0],
      canvasCoordinates[1],
      tolerance,
      this.manager.plot.updateScaleX,
      this.manager.plot.updateScaleY,
      this.manager.config.serverConfig.classification_colors ?? []
    );

    const invertedSx = sx.invert(xs);
    const invertedSy = sy.invert(ys);

    if (!this.pStart.set) {
      if (p) {
        this.pStart.distance = p.distance;
        this.pStart.altitude = p.altitude;
        this.pStart.cx = sx(p.distance ?? 0) + margin.left;
        this.pStart.cy = sy(p.altitude ?? 0) + margin.top;
      } else {
        this.pStart.distance = invertedSx;
        this.pStart.altitude = invertedSy;
        this.pStart.cx = xs;
        this.pStart.cy = ys;
      }

      this.pStart.set = true;
      svg
        .append('circle')
        .attr('id', 'start_m')
        .attr('cx', this.pStart.cx)
        .attr('cy', this.pStart.cy)
        .attr('r', pointSize)
        .style('fill', 'red');
    } else if (!this.pEnd.set) {
      if (p) {
        this.pEnd.distance = p.distance;
        this.pEnd.altitude = p.altitude;
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        this.pEnd.cx = sx(p.distance ?? 0) + margin.left;
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        this.pEnd.cy = sy(p.altitude ?? 0) + margin.top;
      } else {
        this.pEnd.distance = invertedSx;
        this.pEnd.altitude = invertedSy;
        this.pEnd.cx = xs;
        this.pEnd.cy = ys;
      }

      this.pEnd.set = true;
      svg
        .append('circle')
        .attr('id', 'end_m')
        .attr('cx', this.pEnd.cx)
        .attr('cy', this.pEnd.cy)
        .attr('r', pointSize)
        .style('fill', 'red');

      svg
        .append('line')
        .attr('id', 'line_m')
        .attr('x1', this.pStart.cx ?? 0)
        .attr('y1', this.pStart.cy ?? 0)
        .attr('x2', this.pEnd.cx)
        .attr('y2', this.pEnd.cy)
        .attr('stroke-width', 2)
        .attr('stroke', 'red');
    }

    if (this.pStart.set && this.pEnd.set) {
      const dH = (this.pEnd.altitude ?? 0) - (this.pStart.altitude ?? 0);
      const dD = (this.pEnd.distance ?? 0) - (this.pStart.distance ?? 0);

      const height = Math.round(10 * Math.sqrt(Math.pow(dH, 2) + Math.pow(dD, 2))) / 10;

      if (!isNaN(height)) {
        svg
          .append('text')
          .attr('id', 'text_m')
          .attr('x', 10 + ((this.pStart.cx ?? 0) + (this.pEnd.cx ?? 0)) / 2)
          .attr('y', ((this.pStart.cy ?? 0) + (this.pEnd.cy ?? 0)) / 2)
          .text(`${height} m`)
          .attr('font-family', 'sans-serif')
          .attr('font-size', '14px')
          .style('font-weight', 'bold')
          .attr('fill', 'red');
      }
      this.pEnd.set = false;
      this.pStart.set = false;
    }
  }
}
