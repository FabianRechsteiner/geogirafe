import { WfsOperator } from '../../wfs/wfsfilter';

export type SharedFilter = {
  property: string;
  propertyType?: string;
  operator: WfsOperator;
  value: string;
  value2: string;
};

export type SharedLayer =
  | SharedInternalTheme
  | SharedInternalGroup
  | SharedInternalLayer
  | SharedExternalTheme
  | SharedExternalLayer;

export type SharedInternalTheme = {
  id: number;
  order: number;
  checked: number;
  isExpanded: number;
  children: SharedInternalLayer[];
  /**
   * The following attribute will be useful to know which children were explicitly deleted from the view.
   * Without this, we are not able to know if the layer is new in the server configuration
   * And should forcefully be added to the layer tree because the user just didn't know this layer when he has created this shared state
   * Or if it was explicitly removed from the user, and then we won't have to display it again
   */
  excludedChildrenIds: number[];
};

export type SharedInternalGroup = {
  id: number;
  order: number;
  checked: number;
  isExpanded: number;
  timeRestriction?: string;
  children: SharedInternalLayer[];
  /* See comment above */
  excludedChildrenIds: number[];
};

export type SharedInternalLayer = {
  id: number;
  order: number;
  checked: number;
  isExpanded: number;
  timeRestriction?: string;
  opacity?: number;
  swiped?: 'left' | 'right' | 'no';
  filter?: SharedFilter;
};

export type SharedExternalTheme = {
  name: string;
  order: number;
  checked: number;
  isExpanded: number;
  children: SharedExternalLayer[];
};

export type SharedExternalLayer = {
  wms?: {
    title: string;
    name: string;
    url: string;
  };
  wmts?: {
    name: string;
    url: string;
    layer: string;
  };
  order: number;
  checked: number;
  isExpanded: number;
  opacity?: number;
  swiped?: 'left' | 'right' | 'no';
};
