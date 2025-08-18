export type VectorFeatureFileFormat = 'kml' | 'geojson' | 'gpx';
export type PrintFileFormat = 'svg' | 'pdf' | 'png';
export type ColorVariable = 'intensity' | 'natural' | 'classification' | 'uniform';
export type ColorPalette = 'spectral' | 'greys' | 'blues' | 'viridis' | 'magma';
export type Subset = {
  lod: number;
  offset: number;
  count: number;
};
export type Dataset = {
  id: string;
  group: number;
  color: string;
  active: boolean;
  loading: boolean;
  isloaded: boolean;
  levelOfDetail: number;
  colorby: ColorVariable;
  numberOfLoadedPoints: number;
  subsets: Subset[];
};

export interface PytreeResponseData {
  POSITION_PROJECTED_PROFILE: Float32Array;
  RGB: Uint8Array;
  INTENSITY: Float32Array;
  CLASSIFICATION: Uint8Array;
}
