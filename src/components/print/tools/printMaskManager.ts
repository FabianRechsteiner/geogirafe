import PrintMaskLayer from './printMaskLayer.ts';
import StateManager from '../../../tools/state/statemanager.ts';
import Map from 'ol/Map';

/**
 * Independent manager to display a mask layer adapted to the print.
 * Listen to print events to auto setup.
 */
class PrintMaskManager {
  private readonly stateManager: StateManager;
  private readonly printMaskLayer = new PrintMaskLayer({ name: 'PrintMask' });
  private readonly map: Map;

  constructor(map: Map) {
    this.map = map;
    this.stateManager = StateManager.getInstance();
    this.registerEvents();
  }

  get state() {
    return this.stateManager.state;
  }

  private registerEvents() {
    this.stateManager.subscribe('print.format', () => this.onPrintFormatChanged());
    this.stateManager.subscribe('print.scale', () => this.onPrintScaleChanged());
    this.stateManager.subscribe('print.maskVisible', () => this.onPrintMaskVisibleChanged());
  }

  /**
   * Display the mask or hide it.
   * @private
   */
  private onPrintMaskVisibleChanged() {
    if (!this.map) {
      return;
    }
    if (this.state.print.maskVisible) {
      this.map.addLayer(this.printMaskLayer);
    } else {
      this.map.removeLayer(this.printMaskLayer);
      this.renderMask();
    }
  }

  /**
   * Update the size of the mask.
   * @private
   */
  private onPrintFormatChanged() {
    if (!this.state.print.format) {
      return;
    }
    this.printMaskLayer.updateSize(this.state.print.format);
    this.renderMask();
  }

  /**
   * Update the scale of the mask.
   */
  private onPrintScaleChanged() {
    if (this.state.print.scale === null) {
      return;
    }
    this.printMaskLayer.updateScale(this.state.print.scale);
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
}

export default PrintMaskManager;
