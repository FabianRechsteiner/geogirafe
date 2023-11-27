import { Coordinate } from 'ol/coordinate';

class MapPosition {
  center: Coordinate = [];
  zoom: number | null = null;
  resolution: number = 100; /* dummy default value because it should never be null. It will be recalculated when the map will be created */
  scale: number | null = 0;

  get isValid() {
    if (Number.isNaN(this.resolution)) {
      return false;
    }

    if (!this.center[0] || !this.center[1] || Number.isNaN(this.center[0]) || Number.isNaN(this.center[1])) {
      return false;
    }

    return true;
  }
}

export default MapPosition;
