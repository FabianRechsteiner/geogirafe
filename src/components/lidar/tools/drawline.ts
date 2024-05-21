import State from '../../../tools/state/state';

import olCollection from 'ol/Collection';
import olInteractionDraw from 'ol/interaction/Draw';
import olStyleStyle from 'ol/style/Style';
import olStyleStroke from 'ol/style/Stroke';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

import type OlMap from 'ol/Map';
import type OlGeomLineString from 'ol/geom/LineString';
import type OlCollection from 'ol/Collection';
import type OlFeature from 'ol/Feature';
import type OlGeomGeometry from 'ol/geom/Geometry';
import type OlInteractionDraw from 'ol/interaction/Draw';
import type { DrawEvent } from 'ol/interaction/Draw';

type StoreLineChangeFn = (line: OlGeomLineString | null) => void;
type StoreDrawActiveChangeFn = (active: boolean) => void;

/**
 * Side class that adds and manage a draw line interaction
 * and its vector layer on the map.
 * You have to call the "setupSave" method to let this class update your system
 * when a line is drawn or deleted and when the draw line is de/activated.
 */
export default class DrawLine {
  private readonly features: OlCollection<OlFeature<OlGeomGeometry>>;
  private readonly interaction: OlInteractionDraw;
  private readonly vectorLayer: VectorLayer<VectorSource>;
  private storeLineChangeFn: StoreLineChangeFn;
  private storeDrawActiveFn: StoreDrawActiveChangeFn;
  private map?: OlMap;
  private state: State;

  constructor(state: State) {
    this.state = state;
    this.features = new olCollection();
    const source = new VectorSource({
      useSpatialIndex: false,
      features: this.features
    });
    const style = new olStyleStyle({
      stroke: new olStyleStroke({
        color: '#ffcc33',
        width: 2
      })
    });
    this.vectorLayer = new VectorLayer({
      source,
      style
    });

    this.interaction = new olInteractionDraw({
      type: 'LineString',
      features: this.features
    });
    this.storeLineChangeFn = (line: OlGeomLineString | null) => (this.state.lidar.line = line);
    this.storeDrawActiveFn = (active: boolean) => (this.state.lidar.drawActive = active);
  }

  /**
   * The line to set. Pass `null` to clear the line.
   */
  setLine(line: OlGeomLineString | null) {
    line ? this.storeLineChangeFn(line) : this.clear();
  }

  /**
   * Sets the map and add a vector layer on it (if not existing).
   */
  setMap(map: OlMap) {
    if (map) {
      this.map = map;
      const layer = this.map
        .getLayers()
        .getArray()
        .find((layer) => layer === this.vectorLayer);
      if (!layer) {
        this.map.addLayer(this.vectorLayer);
      }
    }
  }

  /**
   * Set the active state of this class and interactions.
   */
  setActive(active: boolean) {
    this.storeDrawActiveFn(active);
    if (active) {
      this.map?.addInteraction(this.interaction);
      this.interaction.setActive(true);
      this.initInteraction();
    } else {
      this.map?.removeInteraction(this.interaction);
      this.clear();
    }
  }

  /**
   * Init and mange the draw interaction.
   */
  initInteraction(): void {
    // Clear the line as soon as a new drawing is started.
    this.interaction.on('drawstart', () => {
      this.features.clear();
    });

    // Update the profile with the new geometry.
    this.interaction.on('drawend', (event: DrawEvent) => {
      this.setLine((event.feature as OlFeature<OlGeomLineString>).getGeometry() ?? null);
      setTimeout(() => {
        // using timeout to prevent double click to zoom the map
        this.interaction.setActive(false);
        this.storeDrawActiveFn(false);
      }, 0);
    });
  }

  /**
   * Clear the line.
   */
  clear(): void {
    this.features.clear();
    this.storeLineChangeFn(null);
  }
}
