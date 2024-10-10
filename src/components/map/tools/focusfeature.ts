import type { Feature, Map } from 'ol';
import VectorSource from 'ol/source/Vector';
import type RenderEvent from 'ol/render/Event';
import type { Geometry } from 'ol/geom';
import type { EventsKey } from 'ol/events';
import type { FrameState } from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { unByKey } from 'ol/Observable';
import { getVectorContext } from 'ol/render';
import { easeOut } from 'ol/easing';
import MapManager from '../../../tools/state/mapManager';
import ConfigManager from '../../../tools/configuration/configmanager';

/**
 * Helps to highlight features on the map by adding an animated
 * style around the features.
 */
export class FocusFeature {
  /** Duration of a flash animation in ms. */
  private readonly flashDuration = 2000;
  private readonly olMap: Map;
  private readonly configManager: ConfigManager;
  private readonly flashStyleCache: Record<string, Style> = {};
  private focusLayer?: VectorLayer<VectorSource>;
  private focusAnimation: EventsKey | null = null;

  constructor() {
    this.olMap = MapManager.getInstance().getMap();
    this.configManager = ConfigManager.getInstance();
    this.configManager.loadConfig().then(() => {
      this.createFocusLayer();
    });
  }

  setFocusedFeatures(features: Feature[] | null) {
    this.flash(features);
  }

  /**
   * Create animated layer for focussing feature.
   * @private
   */
  private createFocusLayer() {
    this.focusLayer = new VectorLayer({
      properties: {
        addToPrintedLayers: true
      },
      source: new VectorSource()
    });
    this.setFocusLayerStyle();
    this.olMap.addLayer(this.focusLayer);
    this.focusLayer.setZIndex(1004);
    this.focusLayer.set('altitudeMode', 'clampToGround');
  }

  /**
   * Set the style of the focus layer.
   * @private
   */
  private setFocusLayerStyle() {
    const config = this.configManager.Config.selection;
    const strokeColor = config.defaultFocusStrokeColor;
    const strokeWidth = config.defaultFocusStrokeWidth;
    const fillColor = config.defaultFocusFillColor;
    const style = new Style({
      stroke: new Stroke({
        color: strokeColor,
        width: strokeWidth
      }),
      fill: new Fill({ color: fillColor }),
      image: new Circle({
        radius: 7,
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({
          color: strokeColor,
          width: strokeWidth
        })
      })
    });
    this.focusLayer!.setStyle(style);
  }

  /**
   * Activates the flash animation for the given features.
   * On null features or empty array, the animation ends.
   * @private
   */
  private flash(features: Feature[] | null) {
    // First deactivate the current animation
    // (We only want one animated object)
    if (this.focusAnimation !== null) {
      unByKey(this.focusAnimation);
    }
    // In case of deselection (feature is null), exit the loop.
    if (!features || !this.focusLayer) {
      return;
    }
    const geometries = features.map((feature) => feature.getGeometry()).filter((geometry) => geometry) as Geometry[];
    // No geometry ? Exit the loop.
    if (!geometries.length) {
      return;
    }
    this.focusAnimation = this.focusLayer.on('postrender', (renderEvent) => {
      geometries.forEach((geometry) => {
        const flashGeom = geometry.clone();
        this.animate(renderEvent, flashGeom);
      });
      // Tell OpenLayers to continue postrender animation (loop).
      this.focusLayer!.changed();
    });
  }

  /**
   * Redraw the geometry.
   * @private
   */
  private animate(renderEvent: RenderEvent, flashGeom: Geometry) {
    const vectorContext = getVectorContext(renderEvent);
    vectorContext.setStyle(this.getFlashStyleCache(renderEvent.frameState));
    vectorContext.drawGeometry(flashGeom);
  }

  /**
   * Get the "flash" style at the current frameState.time.
   * Use cache to not create new style object every N ms!
   * @returns The "Flash" style.
   * @private
   */
  private getFlashStyleCache(frameState?: FrameState): Style {
    const values = FocusFeature.getFlashDynamicValues(frameState?.time ?? 0, this.flashDuration);
    const cacheKeyName = values.join('-');
    const cached = this.flashStyleCache[cacheKeyName];
    if (cached) {
      return cached;
    }
    const style = FocusFeature.createFlashStyle(values);
    this.flashStyleCache[cacheKeyName] = style;
    return style;
  }

  /**
   * @param values - With [radius, opacity, offset] expected.
   * @returns A new "flash" style object based on the given values.
   * @static
   */
  static createFlashStyle(values: number[]): Style {
    const [radius, opacity, offset] = values;
    return new Style({
      image: new Circle({
        radius: radius,
        stroke: new Stroke({
          color: 'rgba(255, 0, 0, ' + opacity + ')',
          width: 0.25 + opacity
        })
      }),
      stroke: new Stroke({
        color: [255, 0, 0, 1],
        width: 12,
        lineDash: [16, 32],
        lineDashOffset: offset
      })
    });
  }

  /**
   * @returns Based on the given frameStateTime, a duration and a easeOut
   * function (quick to slow), returns values:
   * from [radius=5, opacity=1, offset=0]
   * to [radius=30, opacity=0, offset=48]
   * @static
   */
  static getFlashDynamicValues(frameStateTime: number, duration: number): number[] {
    const elapsed = frameStateTime;
    // ElapsedRatio, between 0 and 1.
    const elapsedRatio = (elapsed % duration) / duration;
    const roundedRatio = Math.round(elapsedRatio * 1000) / 1000;
    // Radius will be 5 at start and 30 at end.
    const radius = easeOut(roundedRatio) * 25 + 5;
    // Opacity will be between 0 and 1.
    const opacity = easeOut(1 - roundedRatio);
    // For lines, an offset between 0 and 48.
    const offset = Math.floor(elapsed / 100) % 48;
    return [radius, opacity, offset];
  }
}
