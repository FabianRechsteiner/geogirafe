import type { PrintFileFormat, VectorFeatureFileFormat, ColorVariable, ColorPalette } from './crosssectiontypes';
import type { Marker, Measurement } from './scatterplot';

// Cross-section
export class CrossSectionState {
  loading: boolean = true;
  drawProfile: boolean = true;
  enableAnnotation: boolean = false; // this controls the annotation button's disable property
  drawMarker: boolean = false;
  enableMeasurement: boolean = false; // this controls the measurement button's disable property
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
    max: 10.0,
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
  linestringShift: number = 0.5; // distance by which the linestring coordinates are shifted when the shiftLinestring() method is called
  numberOfPoints: number = 0;
  maxNumberOfPoints: number = 5000000;
  zoom: { k: number; tx: number; ty: number } = { k: 1.0, tx: 0.0, ty: 0.0 };
  zoomUpdate: boolean = false;
  printProfile: boolean = false;
  printFileFormat: PrintFileFormat = 'svg';
  enableLinestringDownload: boolean = false; // this controls the linstring download button's disable property
  downloadLinestringFormat: VectorFeatureFileFormat = 'kml';
  enableAnnotationsDownload: boolean = false; // this controls the annotation download button's disable property
  downloadAnnotationsFormat: VectorFeatureFileFormat = 'kml';
}
