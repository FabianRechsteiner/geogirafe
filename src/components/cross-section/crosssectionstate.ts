import type {
  PrintFileFormat,
  VectorFeatureFileFormat,
  ColorVariable,
  ColorPalette,
  Dataset
} from './crosssectiontypes';
import type { Marker, Measurement } from './scatterplot';

// Cross-section
export class CrossSectionState {
  loading: boolean = false;
  datasets: Dataset[] = [];
  drawProfile: boolean = true;
  enableAnnotation: boolean = false;
  drawMarker: boolean = false;
  enableMeasurement: boolean = false;
  gridVisible: boolean = true;
  drawMeasurement: boolean = false;
  backgroundColor: string = '#ffffff';
  colorVariable: ColorVariable = 'intensity';
  colorUniform: string = '#000000';
  colorPalette: ColorPalette = 'viridis';
  cursorDomainCoordinates: [number, number] = [0.0, 0.0];
  domain: { xmin: number; xmax: number; ymin: number; ymax: number } = {
    xmin: 0.0,
    xmax: 100.0,
    ymin: 0.0,
    ymax: 50.0
  };
  pointSizeSettings: { default: number; min: number; max: number; step: number; value: number } = {
    default: 3.0,
    min: 0.1,
    max: 20.0,
    step: 0.1,
    value: 3.0
  };
  verticalExaggerationSettings: { default: number; min: number; max: number; step: number; value: number } = {
    default: 1.0,
    min: 0.1,
    max: 10.0,
    step: 0.1,
    value: 1.0
  };
  syncViews: boolean = false;
  margins: { left: number; right: number; top: number; bottom: number } = { left: 45, right: 5, top: 10, bottom: 25 };
  sectionWidthSettings: { default: number; min: number; max: number; step: number; value: number } = {
    default: 1.5,
    min: 0.1,
    max: 50.0,
    step: 0.1,
    value: 1.5
  };
  minLOD: number = 1;
  maxLOD: number = 14;
  markers: Marker[] = [];
  measurements: Measurement[] = [];
  linestringCoordinates: [number, number][] = [];
  linestringShift: number = 0.5;
  numberOfPoints: number = 0;
  maxNumberOfPoints: number = 1000000;
  zoom: { k: number; tx: number; ty: number } = { k: 1.0, tx: 0.0, ty: 0.0 };
  zoomUpdate: boolean = false;
  printProfile: boolean = false;
  printFileFormat: PrintFileFormat = 'svg';
  enableLinestringDownload: boolean = false;
  downloadLinestringFormat: VectorFeatureFileFormat = 'kml';
  enableAnnotationsDownload: boolean = false;
  downloadAnnotationsFormat: VectorFeatureFileFormat = 'kml';
  qualitativeColors: string[] = [
    '#E41A1C', // Red
    '#377EB8', // Blue
    '#4DAF4A', // Green
    '#984EA3', // Purple
    '#FF7F00', // Orange
    '#000000ff', // Black
    '#A65628', // Brown
    '#F781BF', // Pink
    '#999999', // Gray
    '#66C2A5', // Teal
    '#A6D854', // Lime
    '#E78AC3' // Light Pink
  ];
}
