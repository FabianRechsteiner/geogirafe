import { Coordinate } from 'ol/coordinate';
import { Extent } from 'ol/extent';

type GeometryResult = {
  type: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon';
  coordinates: Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][];
};
type GeometryCollectionResult = {
  type: 'GeometryCollection';
  geometries: GeometryCollectionResult[] | GeometryResult[];
};

class SearchResult {
  bbox?: Extent;

  geometry?: GeometryResult | GeometryCollectionResult;

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

export type { GeometryResult, GeometryCollectionResult };
export default SearchResult;
