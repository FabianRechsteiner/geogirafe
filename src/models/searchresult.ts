import { Coordinate } from "ol/coordinate";
import { Extent } from "ol/extent";

class SearchResult {

  bbox?: Extent;

  geometry?: {
    type: 'Point' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon';
    coordinates: Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][];
  };

  properties?: {
    label: string;
    layer_name: string;
    actions: {
      action: string;
      data: string;
    }[];
  };

  selected: boolean = false;
}

export default SearchResult;
