import { Coordinate } from 'ol/coordinate';
import DOMPurify from 'dompurify';

class MapPosition {
  center: Coordinate = [];
  zoom: number = 0;
  resolution: number = 100; /* dummy default value because it should never be null. It will be recalculated when the map will be created */
  scale: number = 0;
  crosshair: boolean = false;
  tooltip: string = '';

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

/**
 * Extracts map position details `map_x`, `map_y`, and `map_zoom` from the current URL's query parameters.
 * @returns {MapPosition | undefined} A `MapPosition` instance if valid parameters are found, otherwise undefined.
 */
export const parseMapPositionFromUrl = (): MapPosition | undefined => {
  const url = new URL(window.location.href);
  const mapX = url.searchParams.get('map_x');
  const mapY = url.searchParams.get('map_y');
  const mapZoom = url.searchParams.get('map_zoom');
  const crosshair = url.searchParams.get('map_crosshair');
  const tooltip = url.searchParams.get('map_tooltip');
  if (mapX && mapY && mapZoom) {
    const newPosition = new MapPosition();
    newPosition.center = [parseFloat(mapX), parseFloat(mapY)];
    newPosition.zoom = parseFloat(mapZoom);
    newPosition.crosshair = crosshair === 'true';
    newPosition.tooltip = DOMPurify.sanitize(tooltip as string) ?? '';
    return newPosition.isValid ? newPosition : undefined;
  }
  return undefined;
};
