import type { Callback } from '../../../tools/state/statemanager';

import Map, { FrameState } from 'ol/Map';
import PrintMaskLayer from './printMaskLayer';
import { GeoConsts, StateManager } from '../../../tools/main.ts';
import { getLayerByName } from '../../../tools/olutils.ts';
import { Size } from 'ol/size';

const PRINT_MASK_LAYER_NAME = 'PrintMask';

/**
 * Independent manager to display a mask layer adapted to the print.
 * Listen to print events to auto setup.
 */
class PrintMaskManager {
  private readonly stateManager: StateManager;
  private readonly printMaskLayer = new PrintMaskLayer({ name: PRINT_MASK_LAYER_NAME });
  private readonly map: Map;
  private readonly eventsCallbacks: Callback[] = [];
  private possibleScales: number[] = [];

  constructor(map: Map) {
    this.map = map;
    this.stateManager = StateManager.getInstance();
    this.printMaskLayer.setGetScaleFn(this.getScaleFn.bind(this));
    this.registerEvents();
  }

  get state() {
    return this.stateManager.state;
  }

  destroy() {
    this.stateManager.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;
    this.state.print.maskVisible = false;
    this.onPrintMaskVisibleChanged();
  }

  /**
   * Sets the possible scales to fit the mask/view to.
   */
  setPossibleScales(scales: number[]) {
    this.possibleScales = [...scales].sort((v1, v2) => v2 - v1).reverse();
  }

  /**
   * Sets the resolution of the map view to the optimal resolution for a given scale.
   */
  zoomToScale(scale: number) {
    const mapSize = this.map.getSize() ?? [0, 0];
    const printMapSize = this.state.print.pageSize ?? [0, 0];
    const resolution = PrintMaskManager.getOptimalResolution(mapSize, printMapSize, scale);
    this.map.getView().setResolution(resolution);
  }

  /**
   * Register the events for printing pageSize and mask visibility changes.
   */
  private registerEvents() {
    this.eventsCallbacks.push(
      ...[
        this.stateManager.subscribe('print.pageSize', () => this.onPrintFormatChanged()),
        this.stateManager.subscribe('print.maskVisible', () => this.onPrintMaskVisibleChanged())
      ]
    );
  }

  /**
   * Sets the print.scale value.
   * Calculate the optimal scale for printing based on the map's current frame state and the possible scales.
   * @returns the optimal scale.
   * @private
   */
  private getScaleFn(frameState: FrameState): number {
    // BGE debounce this could be great here
    const mapSize = frameState.size;
    const viewResolution = frameState.viewState.resolution;
    console.assert(this.state.print.pageSize, 'Can not get optimal scale without print pageSize');
    const pageSize = this.state.print.pageSize ?? [0, 0];
    let optimalScale = PrintMaskManager.getOptimalScale(mapSize, viewResolution, pageSize, this.possibleScales);
    if (optimalScale < 0) {
      optimalScale = this.state.print.scale ?? 10000;
    }
    this.state.print.scale = optimalScale;
    return optimalScale;
  }

  /**
   * Display the mask or hide it.
   * @private
   */
  private onPrintMaskVisibleChanged() {
    const isLayerInMap = getLayerByName(this.map, PRINT_MASK_LAYER_NAME);
    if (this.state.print.maskVisible && !isLayerInMap) {
      this.map.addLayer(this.printMaskLayer);
      return;
    }
    if (!this.state.print.maskVisible && isLayerInMap) {
      this.map.removeLayer(this.printMaskLayer);
    }
  }

  /**
   * Update the size (width, height), in pixels of the mask.
   * @private
   */
  private onPrintFormatChanged() {
    if (!this.state.print.pageSize) {
      return;
    }
    this.printMaskLayer.updateSize(this.state.print.pageSize);
    this.renderMask();
  }

  /**
   * Render the mask layer again.
   * @private
   */
  private renderMask() {
    if (this.state.print.maskVisible) {
      this.printMaskLayer.changed();
    }
  }

  /**
   * Calculates the optimal scale for printing a map based on the map size, resolution, desired print size, and available map scales.
   * @param mapSize - The size of the map in meters. Expressed as an array [width, height].
   * @param mapResolution - The resolution of the map in meters per pixel.
   * @param printMapSize - The desired size of the printed map in inches. Expressed as an array [width, height].
   * @param mapScales - The available map scales.
   * @returns The optimal scale for printing the map or -1 if any.
   */
  static getOptimalScale(mapSize: Size, mapResolution: number, printMapSize: number[], mapScales: number[]): number {
    const mapWidth = mapSize[0] * mapResolution;
    const mapHeight = mapSize[1] * mapResolution;

    const scaleWidth = (mapWidth * GeoConsts.INCHES_PER_METER * GeoConsts.PRINT_DOTS_PER_INCH) / printMapSize[0];
    const scaleHeight = (mapHeight * GeoConsts.INCHES_PER_METER * GeoConsts.PRINT_DOTS_PER_INCH) / printMapSize[1];

    const scale = Math.min(scaleWidth, scaleHeight);

    return mapScales.reduce((optimal: number, currentScale: number) => {
      return scale > currentScale ? currentScale : optimal;
    }, -1);
  }

  /**
   * Calculates the optimal resolution for printing a map based on the provided parameters.
   * @param mapSize - The size of the map in meters.
   * @param printMapSize - The size of the map to be printed in dots.
   * @param scale - The scale at which the map should be printed.
   * @returns The optimal resolution for printing the map.
   */
  static getOptimalResolution = (mapSize: Size, printMapSize: number[], scale: number) => {
    const dotsPerMeter = GeoConsts.PRINT_DOTS_PER_INCH * GeoConsts.INCHES_PER_METER;
    const resolutionX = (printMapSize[0] * scale) / (dotsPerMeter * mapSize[0]);
    const resolutionY = (printMapSize[1] * scale) / (dotsPerMeter * mapSize[1]);
    return Math.max(resolutionX, resolutionY);
  };
}

export default PrintMaskManager;
