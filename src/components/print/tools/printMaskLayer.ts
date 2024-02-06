import Layer from 'ol/layer/Layer';
import { createCanvasContext2D } from 'ol/dom';
import { toRadians } from 'ol/math';
import GeoConsts from '../../../tools/geoconsts.ts';
import { FrameState } from 'ol/Map';

/**
 * A layer to display a mask for a zone to print.
 */
class PrintMaskLayer extends Layer {
  private size: [number, number] | null = null;
  private scale: number | null = null;
  private context: CanvasRenderingContext2D;

  constructor(options = {}) {
    super({ className: 'printMask', ...options });

    this.context = createCanvasContext2D();
    this.context.canvas.style.opacity = '0.5';
    this.context.canvas.style.position = 'absolute';
  }

  updateSize(size: [number, number]) {
    this.size = size;
  }

  updateScale(scale: number) {
    this.scale = scale;
  }

  getRotation() {
    console.warn('Not implemented yet');
    return 0;
  }

  /**
   * Draw the print canvas mask.
   */
  render(frameState: FrameState) {
    if (this.size === null) {
      throw Error('Cannot render Mask : size has not been set.');
    }
    if (this.scale === null) {
      throw Error('Cannot render Mask : scale has not been set.');
    }

    const cwidth = frameState.size[0];
    this.context.canvas.width = cwidth;
    const cheight = frameState.size[1];
    this.context.canvas.height = cheight;
    const center = [cwidth / 2, cheight / 2];

    // background (clockwise)
    this.context.beginPath();
    this.context.moveTo(0, 0);
    this.context.lineTo(cwidth, 0);
    this.context.lineTo(cwidth, cheight);
    this.context.lineTo(0, cheight);
    this.context.lineTo(0, 0);
    this.context.closePath();

    const height = this.size[1];
    const width = this.size[0];
    const resolution = frameState.viewState.resolution;

    const extentHalfWidth =
      ((width / GeoConsts.PRINT_DOTS_PER_INCH / GeoConsts.INCHES_PER_METER) * this.scale) / resolution / 2;
    const extentHalfHeight =
      ((height / GeoConsts.PRINT_DOTS_PER_INCH / GeoConsts.INCHES_PER_METER) * this.scale) / resolution / 2;

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

    // hole (counter-clockwise)
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this.context.lineTo(x3, y3);
    this.context.lineTo(x4, y4);
    this.context.lineTo(x1, y1);
    this.context.closePath();

    this.context.fillStyle = '#000';
    this.context.fill();

    return this.context.canvas;
  }
}

export default PrintMaskLayer;
