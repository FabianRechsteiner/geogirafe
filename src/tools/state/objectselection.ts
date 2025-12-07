import { Feature } from 'ol';
import SelectionParam from '../../models/selectionparam';
import WfsFilter from '../wfs/wfsfilter';
import { SelectionMode } from '../../models/selection';
import { Geometry } from 'ol/geom';

export default class ObjectSelection {
  initialSelectionBox?: number[];
  initialSelectionQuery?: InitialSelectionQuery;
  selectionParameters: SelectionParam[] = [];
  selectedFeatures: Feature[] = [];
  focusedFeatures: Feature[] | null = null;
  highlightedFeatures: Feature[] = [];
  gridSelected: boolean = false;
  selectionMode: SelectionMode = SelectionMode.Replace;
  selectionGeometry?: Geometry;
}

export type InitialSelectionQuery = { query: WfsFilter[]; layerName: string };
