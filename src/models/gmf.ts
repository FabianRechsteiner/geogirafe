import ITimeOptions from '../tools/time/itimeoptions';
import ISnappingConfig from '../tools/snap/isnapconfig';
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
  snappingConfig?: ISnappingConfig;
  timeAttribute?: string;
  opacity?: number;
  layerName?: string; // TODO REG: only temporary for Vector-Tiles. Should probably be removed when the backend will support a proper configuration
}

export interface GMFChildLayer {
  name: string;
  queryable: boolean;
  editable?: string;
  minResolutionHint?: number;
  maxResolutionHint?: number;
}

export interface GMFTreeItem {
  id: number;
  name: string;
  metadata?: GMFMetadata;
  mixed?: boolean;
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
  time?: ITimeOptions;
  public?: boolean;
}

export type GMFThemeFunctionality = string | string[] | number | number[] | boolean | boolean[];

export interface GMFThemeFunctionalities {
  [key: string]: GMFThemeFunctionality;
}

export interface GMFTheme {
  id: number;
  name: string;
  icon: string;
  functionalities: GMFThemeFunctionalities;
  metadata: GMFMetadata;
  children: GMFTreeItem[];
}

export interface GMFGroup extends GMFTreeItem {
  children: GMFTreeItem[];
}

export type GMFBackgroundLayer = GMFTreeItem;

export interface GMFServerOgc {
  url: string;
  wfsSupport: boolean;
  urlWfs?: string;
  oapifSupport?: boolean;
  urlOapif?: string;
  type: string;
  imageType: string;
  attributes?: GMFServerOgcAttributes;
}

export type GMFServerOgcAttributes = Record<string, GMFServerOgcObjectAttributes>;
export type GMFServerOgcObjectAttributes = Record<string, GMFServerOgcColumnAttributes>;
export interface GMFServerOgcColumnAttributes {
  alias: string;
}
