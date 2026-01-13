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
  /**
   * When configuring the share with "preferNames=true", the name of the layer will be used to generate the sahred state
   * instead of the ID. But in this case, we also have to share the type os the layer, because tha layer name can be
   * the same for a them, a group, a WMS-Layer, a WMTSLayer, etc...
   * Also note that the "excludedChildrenNames" options has some limitations : if we have 2 layers of different types with the same name
   * And if one of it is exceluded, both will be excluded.
   */
  name: string;
  type: string;
  excludedChildrenNames: string[];
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
  /* See comment above */
  name: string;
  type: string;
  excludedChildrenNames: string[];
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
  /* See comment above */
  name: string;
  type: string;
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

export type SharedBasemap = {
  id: number;
  name: string;
  opacity: number;
};
