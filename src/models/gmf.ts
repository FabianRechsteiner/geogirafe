/**
 * These are the models for a GeoMapFish backend
 */

export interface GMFMetadata {
  ogcServer?: string;
  legend?: string;
  iconUrl?: string;
  legendRule?: string;
  legendImage?: string;
  isLegendExpanded: boolean;
  wasLegendExpanded: boolean;
  exclusiveGroup: boolean;
  isExpanded: boolean;
  isChecked: boolean;
  disclaimer?: string;
  hiDPILegendImages?: Record<string, string>;
  printLayers?: string;
  wmsLayers?: string;
  printNativeAngle?: boolean;
}

export interface GMFChildLayer {
  name: string;
  queryable: boolean;
}

export interface GMFTreeItem {
  id: number;
  name: string;
  ogcServer?: string;
  children?: GMFTreeItem[];
  type?: string;
  url?: string;
  style?: string;
  source?: string;
  projection?: string;
  imageType?: string;
  minResolutionHint?: number;
  maxResolutionHint?: number;
  metadata: GMFMetadata;
  layers?: string;
  childLayers?: GMFChildLayer[];
  layer?: string;
  dimensions?: Record<string, object>;
}

export interface GMFTheme {
  id: number;
  name: string;
  icon: string;
  // TODO: make a type for this if necessary
  functionalities: {
    [key: string]: string;
  };
  metadata: GMFMetadata;
  children: GMFTreeItem[];
}

export interface GMFGroup extends GMFTreeItem {
  children: GMFTreeItem[];
}

export interface GMFBackgroundLayer extends GMFTreeItem {
  children?: Array<GMFTreeItem>;
  mixed?: boolean;
}
