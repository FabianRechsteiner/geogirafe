import { Coordinate } from 'ol/coordinate';

// In thos types, the boolean are converted to numbers (true=1, false=0)
// This will save characters in the string to minize the length in the URL
export type SharedLayer = {
  i: number; // id
  o: number; // order
  c: number; // checked (boolean)
  e: number; // isGroupExpanded or isLegendExpanded (boolean)
  z: SharedLayer[]; // children
};

export type SharedFeatureAttributes = {
  n?: string; // Name
  o?: string; // StrokeColor;
  w?: number; // StrokeWidth;
  f?: string; // FillColor;
  t?: number; // TextSize;
};

export enum SharedGeometryType {
  Point = 0,
  LineString = 1,
  Polygon = 2,
  Circle = 3
}

export type SharedFeature = {
  t: SharedGeometryType;
  g: Coordinate | Coordinate[] | Coordinate[][] | [Coordinate, number]; // Geometry/Coordinates if supported by GEOJSon (not a circle), Center + Radius otherwise
  p?: SharedFeatureAttributes;
};

export type SharedState = {
  // This state will be encoded in Base64.
  // Therefore, the names of the attributes have been reduced to the minimum possible length

  p: {
    // position
    c: Coordinate; // center
    r: number; // resolution
  };
  t: {
    // treeview
    a: number; // advanced (boolean)
  };
  g: {
    // globe
    d: 'none' | 'full' | 'side'; // display
  };
  b?: {
    // basemap
    i: number; // id
  };
  l: SharedLayer[]; // layers
  f: SharedFeature[]; // Drawn features
};
