import { Feature } from 'ol';
import SelectionParam from '../../models/selectionparam';
import WfsFilter from '../wfs/wfsfilter';

export default class ObjectSelection {
  initialSelectionBox?: number[];
  initialSelectionQuery?: InitialSelectionQuery;
  selectionParameters: SelectionParam[] = [];
  selectedFeatures: Feature[] = [];
  focusedFeatures: Feature[] | null = null;
  highlightedFeatures: Feature[] = [];
  gridSelected: boolean = false;
}

export type InitialSelectionQuery = { query: WfsFilter[]; layerName: string };
