/**
 * These are the models for a GeoMapFish backend
 */

export interface GMFMetadata {
  isLegendExpanded: boolean;
  wasLegendExpanded: boolean;
  exclusiveGroup: boolean;
  isExpanded: boolean;
  isChecked: boolean;
  ogcServer?: string;
  legend?: boolean;
  iconUrl?: string;
  legendRule?: string;
  legendImage?: string;
  disclaimer?: string;
  metadataUrl?: string;
  hiDPILegendImages?: Record<string, string>;
  printLayers?: string;
  queryLayers?: string;
  wmsLayers?: string;
  printNativeAngle?: boolean;
  protected?: boolean;
  thumbnail?: string;
}

export interface GMFChildLayer {
  name: string;
  queryable: boolean;
}

export interface GMFTreeItem {
  id: number;
  name: string;
  metadata?: GMFMetadata;
  ogcServer?: string;
  children?: GMFTreeItem[];
  type?: 'OSM' | 'WMS' | 'WMTS' | 'VectorTiles' | 'COG' | 'XYZ';
  url?: string;
  style?: string;
  source?: string;
  projection?: string;
  imageType?: string;
  minResolutionHint?: number;
  maxResolutionHint?: number;
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

export interface GMFBackgroundLayer extends GMFTreeItem {}

export interface GMFServerOgc {
  url: string;
  wfsSupport: boolean;
  urlWfs?: string;
  type: string;
  imageType: string;
}
