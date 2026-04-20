// SPDX-License-Identifier: Apache-2.0
import { Coordinate } from 'ol/coordinate';

export type MapMarker = {
  imageUrl: string;
  position: Coordinate;
};

class MapPosition {
  public center: Coordinate = [];
  public zoom?: number;
  public resolution?: number;
  public scale?: number;
  public crosshair?: Coordinate;
  public tooltip?: {
    content: string;
    position?: Coordinate;
  };
  public markers: MapMarker[] = [];

  public get isValid() {
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
    for (const marker of this.markers) {
      position.markers.push({
        imageUrl: marker.imageUrl,
        position: marker.position
      });
    }

    return position;
  }
}

export default MapPosition;
