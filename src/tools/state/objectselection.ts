// SPDX-License-Identifier: Apache-2.0
import { Feature } from 'ol';
import SelectionParam from '../../models/selectionparam';
import WfsFilter from '../wfs/wfsfilter';
import { SelectionMode } from '../../models/selection';
import { Geometry } from 'ol/geom';

export default class ObjectSelection {
  public initialSelectionBox?: number[];
  public initialSelectionQuery?: InitialSelectionQuery;
  public selectionParameters: SelectionParam[] = [];
  public selectedFeatures: Feature[] = [];
  public focusedFeatures: Feature[] | null = null;
  public highlightedFeatures: Feature[] = [];
  public gridSelected: boolean = false;
  public selectionMode: SelectionMode = SelectionMode.Replace;
  public selectionGeometry?: Geometry;
}

export type InitialSelectionQuery = { query: WfsFilter[]; layerName: string };
