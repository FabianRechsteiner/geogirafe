import { Coordinate } from 'ol/coordinate';

// In those types, the boolean are converted to numbers (true=1, false=0)
// This will save characters in the string to minize the length in the URL
export type SharedLayer = {
  i: number; // id
  o: number; // order
  c: number; // checked (boolean)
  e: number; // isGroupExpanded or isLegendExpanded (boolean)
  z: SharedLayer[]; // children
  /**
   * The following attribute will be useful to know which children were explicitely deleted from the view.
   * Without this, we are not able to know if the layer is new in the server configuration
   * And should be forcely added to the layertree because the user just didn't know this layer when he has created this shared state
   * Or if it was explicitely removed from the user, and then we won't have to display it again
   */
  x: number[]; // explicit excluded children.
};

export type SharedState = {
  // This state will be encoded in Base64.
  // Therefore, the names of the attributes have been reduced to the minimum possible length

  p: {
    // position
    c: Coordinate; // center
    r: number; // resolution
  };
  // map
  m: {
    p: string; // Projection code
  };
  t: {
    // treeview
    a: number; // advanced (boolean)
  };
  g: {
    // globe
    d: '2D' | '3D' | '2D/3D'; // display
  };
  b?: {
    // basemap
    i: number; // id
  };
  l: SharedLayer[]; // layers;
  f?: unknown; // Drawn features
};
