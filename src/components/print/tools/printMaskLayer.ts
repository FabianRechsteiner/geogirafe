// SPDX-License-Identifier: Apache-2.0
import type { FrameState } from 'ol/Map';
import { toRadians } from 'ol/math';
import GeoConsts from '../../../tools/geoconsts';
import SimpleMaskLayer from '../../../tools/layers/simplemasklayer';

export type ScaleFn = (frameState: FrameState) => number;

/**
 * A layer to display a mask with a scale- and page size dependent cut-out box for printing.
 */
class PrintMaskLayer extends SimpleMaskLayer {
  private scaleFn?: ScaleFn;

  public constructor(options = {}) {
    super({ className: 'printMask', ...options });
  }

  /**
   * Sets the provided scale function to retrieve the current scale.
   */
  setGetScaleFn(scaleFn: ScaleFn) {
    this.scaleFn = scaleFn;
  }

  getRotation() {
    // Not implemented yet
    return 0;
  }

  /**
   * Draw the print canvas mask.
   */
  override render(frameState: FrameState) {
    if (this.size === null) {
      throw Error('Cannot render Mask : size has not been set.');
    }
    if (!this.scaleFn) {
      throw Error('Cannot render Mask : scaleDn has not been set.');
    }

    const cwidth = frameState.size[0];
    const cheight = frameState.size[1];
    const center = [cwidth / 2, cheight / 2];
    const height = this.size[1];
    const width = this.size[0];
    const resolution = frameState.viewState.resolution;

    const scale = this.scaleFn(frameState);
    const extentHalfWidth =
      ((width / GeoConsts.PRINT_DOTS_PER_INCH / GeoConsts.INCHES_PER_METER) * scale) / resolution / 2;
    const extentHalfHeight =
      ((height / GeoConsts.PRINT_DOTS_PER_INCH / GeoConsts.INCHES_PER_METER) * scale) / resolution / 2;

    const rotation = this.getRotation !== undefined ? toRadians(this.getRotation()) : 0;

    // diagonal = distance p1 to center.
    const diagonal = Math.sqrt(Math.pow(extentHalfWidth, 2) + Math.pow(extentHalfHeight, 2));
    // gamma = angle between horizontal and diagonal (with rotation).
    const gamma = Math.atan(extentHalfHeight / extentHalfWidth) - rotation;
    // omega = angle between diagonal and vertical (with rotation).
    const omega = Math.atan(extentHalfWidth / extentHalfHeight) - rotation;
    // Calculation of each corner.
    const x1 = center[0] - Math.cos(gamma) * diagonal;
    const y1 = center[1] + Math.sin(gamma) * diagonal;
    const x2 = center[0] + Math.sin(omega) * diagonal;
    const y2 = center[1] + Math.cos(omega) * diagonal;
    const x3 = center[0] + Math.cos(gamma) * diagonal;
    const y3 = center[1] - Math.sin(gamma) * diagonal;
    const x4 = center[0] - Math.sin(omega) * diagonal;
    const y4 = center[1] - Math.cos(omega) * diagonal;

    this.drawBoxMask(cwidth, cheight, [x1, y1], [x2, y2], [x3, y3], [x4, y4]);
    return this.context.canvas;
  }
}

export default PrintMaskLayer;
