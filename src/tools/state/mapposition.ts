import { Coordinate } from 'ol/coordinate';

class MapPosition {
  center: Coordinate = [];
  zoom: number = 0;
  // Dummy default value because it should never be null. It will be recalculated when the map is created
  resolution: number = -1;
  scale: number = 0;
  crosshair?: Coordinate;
  tooltip?: {
    content: string;
    position?: Coordinate;
  };

  get isValid() {
    if (Number.isNaN(this.resolution)) {
      return false;
    }

    if (!this.center[0] || !this.center[1] || Number.isNaN(this.center[0]) || Number.isNaN(this.center[1])) {
      return false;
    }

    return true;
  }

  public clone(): MapPosition {
    const position = new MapPosition();
    position.center = [...this.center];
    position.zoom = this.zoom;
    position.resolution = this.resolution;
    position.scale = this.scale;
    position.crosshair = this.crosshair ? [...this.crosshair] : undefined;
    position.tooltip = this.tooltip
      ? {
          content: this.tooltip.content,
          position: this.tooltip.position ? [...this.tooltip.position] : undefined
        }
      : undefined;

    return position;
  }
}

export default MapPosition;
