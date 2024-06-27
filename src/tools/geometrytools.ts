import { fromLonLat } from 'ol/proj';

export function niceCoordinates(coords: number[], locale: string): string[] {
  const east = (Math.round(coords[0] * 100) / 100).toLocaleString(locale, { minimumFractionDigits: 2 });
  const nord = (Math.round(coords[1] * 100) / 100).toLocaleString(locale, { minimumFractionDigits: 2 });
  return [east, nord];
}

/**
 * @param coords 2 numbers
 * @param extent 4 numbers min max
 * @returns true if coords is intersects extent
 */
function isWithinExtent(coords: number[], extent: number[]): boolean {
  return coords[0] >= extent[0] && coords[0] <= extent[2] && coords[1] >= extent[1] && coords[1] <= extent[3];
}

/**
 * Will check if given coords can be mapped to a max extent
 * if not, an empty array is returned
 * @param coords [lat, lon], [lon, lat], [east, north] accepted
 * @param extent bbox of 4 numbers, typically maxExtent defined in config
 * @returns coords in provided srid if extent is given, otherwise, returns coords
 */
export function parseCoordinates(coords: number[], extent: number[] | undefined, srid: string): number[] {
  if (!extent) {
    return coords;
  }

  // when coordinates are in current srid, we check they are in extent
  if (isWithinExtent(coords, extent)) {
    return coords;
  }

  // if given [lon, lat]
  let [east, north] = fromLonLat(coords, srid);
  if (isWithinExtent([east, north], extent)) {
    return [east, north];
  }

  // if given [lat, long]
  coords.reverse();
  [east, north] = fromLonLat(coords, srid);
  if (isWithinExtent([east, north], extent)) {
    return [east, north];
  }

  return [];
}
