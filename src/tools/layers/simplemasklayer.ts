// SPDX-License-Identifier: Apache-2.0
import type { FrameState } from 'ol/Map';
import { createCanvasContext2D } from 'ol/dom';
import Layer from 'ol/layer/Layer';

/**
 * A layer to display a simple mask with a cut-out box in the middle.
 */
class SimpleMaskLayer extends Layer {
  protected readonly context: CanvasRenderingContext2D;
  protected size: [number, number] | null = null;
  private readonly fillColor: string;

  public constructor(options = {}, color: string = '#000') {
    super({ className: 'simpleMask', ...options });

    this.fillColor = color;
    this.context = createCanvasContext2D();
    this.context.canvas.style.opacity = '0.5';
    this.context.canvas.style.position = 'absolute';
  }

  /**
   * Updates the box size (width, height), in pixel, of the mask.
   */
  public updateSize(size: [number, number]) {
    this.size = size;
  }

  /**
   * Draw the mask.
   */
  public override render(frameState: FrameState) {
    if (this.size === null) {
      throw Error('Cannot render Mask : size has not been set.');
    }
    const canvasWidth = frameState.size[0];
    const canvasHeight = frameState.size[1];

    const boxCorners = SimpleMaskLayer.calculateBoxCorners(canvasWidth, canvasHeight, this.size[0], this.size[1]);

    this.drawBoxMask(canvasWidth, canvasHeight, ...boxCorners);

    return this.context.canvas;
  }

  /**
   * Draws a mask with a cut-out box shape on the map canvas context.
   *
   * @param {number} canvasWidth - The width of the canvas.
   * @param {number} canvasHeight - The height of the canvas.
   * @param {[number, number]} box_ul - The [x, y] coordinates of the upper-left corner of the cut-out box.
   * @param {[number, number]} box_ur - The [x, y] coordinates of the upper-right corner of the cut-out box.
   * @param {[number, number]} box_lr - The [x, y] coordinates of the lower-right corner of the cut-out box.
   * @param {[number, number]} box_ll - The [x, y] coordinates of the lower-left corner of the cut-out box.
   */
  public drawBoxMask(
    canvasWidth: number,
    canvasHeight: number,
    box_ul: [number, number],
    box_ur: [number, number],
    box_lr: [number, number],
    box_ll: [number, number]
  ) {
    this.context.canvas.width = canvasWidth;
    this.context.canvas.height = canvasHeight;

    // Draw background (clockwise)
    this.context.beginPath();
    this.context.moveTo(0, 0);
    this.context.lineTo(canvasWidth, 0);
    this.context.lineTo(canvasWidth, canvasHeight);
    this.context.lineTo(0, canvasHeight);
    this.context.lineTo(0, 0);
    this.context.closePath();

    // Draw hole (counter-clockwise)
    this.context.moveTo(...box_ul);
    this.context.lineTo(...box_ur);
    this.context.lineTo(...box_lr);
    this.context.lineTo(...box_ll);
    this.context.lineTo(...box_ul);
    this.context.closePath();

    this.context.fillStyle = this.fillColor;
    this.context.fill();
  }

  private static calculateBoxCorners(
    totalWidth: number,
    totalHeight: number,
    boxWidth: number,
    boxHeight: number
  ): [[number, number], [number, number], [number, number], [number, number]] {
    if (totalWidth <= 0 || totalHeight <= 0) {
      throw new Error('Both totalWidth and totalHeight must be greater than 0.');
    }
    if (boxWidth <= 0 || boxHeight <= 0) {
      throw new Error('Both boxWidth and boxHeight must be greater than 0.');
    }

    const center = [totalWidth / 2, totalHeight / 2];
    const halfWidthRectangle = boxWidth / 2;
    const halfHeightRectangle = boxHeight / 2;

    const xMin = center[0] - halfWidthRectangle;
    const yMax = center[1] + halfHeightRectangle;
    const yMin = center[1] - halfHeightRectangle;
    const xMax = center[0] + halfWidthRectangle;

    return [
      [xMin, yMax],
      [xMax, yMax],
      [xMax, yMin],
      [xMin, yMin]
    ];
  }
}

export default SimpleMaskLayer;
