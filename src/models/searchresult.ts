import { Coordinate } from 'ol/coordinate';
import { Extent } from 'ol/extent';

export type GeometryResult = {
  type: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon';
  coordinates: Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][];
};
export type GeometryCollectionResult = {
  type: 'GeometryCollection';
  geometries: GeometryCollectionResult[] | GeometryResult[];
};

export type AllSearchResults = {
  type: string;
  features: SearchResult[];
};

export default class SearchResult {
  public bbox?: Extent;

  public geometry?: GeometryResult | GeometryCollectionResult;

  public properties?: {
    label: string;
    layer_name: string;
    actions: {
      action: string;
      data: string;
    }[];
  };

  public selected: boolean = false;
}
