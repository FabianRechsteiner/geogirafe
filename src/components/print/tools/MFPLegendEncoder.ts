// SPDX-License-Identifier: Apache-2.0
import type GroupLayer from '../../../models/layers/grouplayer';
import type BaseLayer from '../../../models/layers/baselayer';
import type MapManager from '../../../tools/state/mapManager';
import type I18nManager from '../../../tools/i18n/i18nmanager';
import type State from '../../../tools/state/state';

import LayerWms from '../../../models/layers/layerwms';
import LayerWmts from '../../../models/layers/layerwmts';
import GeoConsts from '../../../tools/geoconsts';
import { isLayerVisible } from './printUtils';
import LegendHelper from '../../../tools/legendhelper';

/** Represents the options for encoding a legend. */
export interface EncodeLegendOptions {
  mapManager: MapManager;
  i18nManager: I18nManager;
  state: State;
  scale: number;
  printResolution: number;
  dpi: number;
  pageSize: number[];
  extent?: number[];
  useExtent?: boolean;
  label?: Record<string, boolean | undefined>;
  params?: Record<string, Record<string, unknown>>;
  showGroupsTitle?: boolean;
}

/** Represents a class in the MFP legend. */
export interface MFPLegendClass {
  name?: string;
  icons?: string[];
  dpi?: number;
  classes?: MFPLegendClass[];
}

/** Represents a LegendURLDPI object. */
export interface LegendURLDPI {
  url: string;
  dpi: number;
}

/**
 * Class representing an encoder for creating a legend in the MFP (MapFishPrint) format.
 * Iterates on the layer tree layers to collect layers in the right order and with all metadata.
 */
export class MFPLegendEncoder {
  protected options?: EncodeLegendOptions;
  protected defaultOptions: Partial<EncodeLegendOptions> = {
    useExtent: true,
    label: {},
    params: {},
    showGroupsTitle: true
  };

  /**
   * Sets the options for encoding legend.
   */
  setOptions(options: EncodeLegendOptions) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Encodes the legend based on the provided options.
   * @returns The encoded legend or null if no legend classes were found.
   */
  encodeLegend(options: EncodeLegendOptions): MFPLegendClass | null {
    this.setOptions(options);
    const layerLegend = this.encodeLayersLegend(options.state.layers.layersList);
    const legend: MFPLegendClass = { classes: layerLegend };
    return legend.classes!.length > 0 ? legend : null;
  }

  /**
   * Encodes the legends of every given base layers (recursively).
   * @returns The encoded legends as an array of MFPLegendClass objects.
   */
  encodeLayersLegend(layers: BaseLayer[]): MFPLegendClass[] {
    const groupClasses: MFPLegendClass[] = [];
    [...layers].forEach((layer) => {
      const item = this.encodeLayerLegendClasses(layer);
      if (item) {
        this.addClassItemToArray(groupClasses, item);
      }
    });
    return groupClasses;
  }

  /**
   * Encodes the legend classes for a given layer, based on its type or className.
   * @returns The encoded legend classes for the layer, or null if the layer is not supported.
   */
  encodeLayerLegendClasses(layer: BaseLayer): MFPLegendClass | null {
    if ((layer as GroupLayer).children) {
      return this.encodeLayerGroupLegendClasses(layer as GroupLayer);
    }
    if (layer.className === LayerWms.name) {
      return this.encodeLayerWmsLegendClasses(layer as LayerWms);
    }
    if (layer.className === LayerWmts.name) {
      return this.encodeLayerWmtsLegendClasses(layer as LayerWmts);
    }
    return null;
  }

  /**
   * @returns The encoded legend class for the layer group.
   */
  encodeLayerGroupLegendClasses(layerGroup: GroupLayer): MFPLegendClass {
    const legendGroupItem: MFPLegendClass = {};
    if (this.options?.showGroupsTitle) {
      legendGroupItem.name = this.options?.i18nManager.getTranslation(layerGroup.name);
    }
    const groupClasses: MFPLegendClass[] = [];
    legendGroupItem.classes = groupClasses;
    layerGroup.children.forEach((childLayer) => {
      const child = this.encodeLayerLegendClasses(childLayer);
      if (child) {
        this.addClassItemToArray(groupClasses, child);
      }
    });
    return this.tryToSimplifyLegendGroup(legendGroupItem);
  }

  /**
   * @returns The encoded legend classes for a given WMTS
   * layer, or null if the layer is not visible or inactive.
   */
  encodeLayerWmtsLegendClasses(layerWmts: LayerWmts): MFPLegendClass | null {
    if (!isLayerVisible(layerWmts, this.options?.printResolution) || layerWmts.inactive) {
      return null;
    }
    let icon_dpi = this.getMetadataLegendImage(layerWmts);
    if (!icon_dpi && layerWmts._olayer) {
      const url = LegendHelper.getWMTSLegendURL(layerWmts._olayer);
      if (url) {
        icon_dpi = {
          url: url,
          dpi: GeoConsts.SCREEN_DOTS_PER_INCH
        };
      }
    }
    if (icon_dpi) {
      return {
        name: this.options?.i18nManager.getTranslation(layerWmts.name),
        icons: [icon_dpi.url]
      };
    }
    return null;
  }

  /**
   * @returns The encoded legend classes for a WMS
   * layer, or null if the layer is not visible or inactive.
   */
  encodeLayerWmsLegendClasses(layerWms: LayerWms): MFPLegendClass | null {
    if (!isLayerVisible(layerWms, this.options?.printResolution) || layerWms.inactive) {
      return null;
    }

    const ogcServers = this.options?.state.ogcServers;
    const ogcServer = ogcServers ? ogcServers[layerWms.ogcServer.name] : undefined;
    const serverType = ogcServer?.type ?? '';
    const dpi = this.options?.dpi ?? GeoConsts.SCREEN_DOTS_PER_INCH;

    // Case node as a legend image
    const icon_dpi = this.getMetadataLegendImage(layerWms);
    if (icon_dpi) {
      return this.getLegendClassForWMS(layerWms.name, icon_dpi, serverType);
    }

    // Case node has no legend image => Get the url for each WMS layer.
    const legendLayerClasses: MFPLegendClass[] = [];
    const legendGroupItem: MFPLegendClass = {
      classes: legendLayerClasses
    };
    if (this.options?.showGroupsTitle) {
      legendGroupItem.name = this.options?.i18nManager.getTranslation(layerWms.name);
    }
    const layerNames = layerWms.layers?.split(',') ?? [];
    layerNames.forEach((name) => {
      const url = LegendHelper.getWMSLegendURL(layerWms.ogcServer, name, {
        dpi,
        serverType,
        scale: this.options?.scale,
        bbox: this.options?.extent,
        srs: this.options?.mapManager.getMap().getView().getProjection().getCode(),
        additionalQueryString: this.options?.params ? this.options?.params[serverType] : undefined
      });
      if (!url) {
        console.error('Missing legend url for wms: ', layerWms.name);
        return;
      }
      const icon_dpi = {
        url: url,
        dpi: serverType === 'qgisserver' ? dpi : GeoConsts.SCREEN_DOTS_PER_INCH
      };
      legendLayerClasses.push(this.getLegendClassForWMS(name, icon_dpi, serverType));
    });
    // Case of wms layer with only one layer, use the node name and remove the useless class level.
    if (legendLayerClasses.length === 1) {
      const firstLegendLayer = legendLayerClasses[0];
      delete firstLegendLayer.classes;
      firstLegendLayer.name = this.options?.i18nManager.getTranslation(layerWms.name);
      return firstLegendLayer;
    }
    return this.tryToSimplifyLegendGroup(legendGroupItem);
  }

  /**
   * @returns a MFPLegendClass object representing the legend class for a WMS layer name.
   */
  getLegendClassForWMS(layerName: string, icon_dpi: LegendURLDPI, serverType: string): MFPLegendClass {
    const legendItem = {
      name: this.mustHideLabel(serverType) ? '' : this.options?.i18nManager.getTranslation(layerName),
      icons: [icon_dpi.url]
    };
    if (icon_dpi.dpi !== GeoConsts.SCREEN_DOTS_PER_INCH) {
      Object.assign(legendItem, { dpi: icon_dpi.dpi });
    }
    return legendItem;
  }

  /**
   * Retrieves the metadata legend image or hiDPILegendImages for the given layer.
   * @returns The metadata legend image URL and DPI, or null if not found.
   */
  getMetadataLegendImage(layer: LayerWms | LayerWmts): LegendURLDPI | null {
    let dpi = this.options?.dpi ?? -1;
    if (dpi === -1) {
      dpi = GeoConsts.SCREEN_DOTS_PER_INCH;
    }

    let found_dpi = dpi;
    let legendImage = layer.legendImage;
    const hiDPILegendImages = layer.hiDPILegendImages;
    let dist = Number.MAX_VALUE;
    if (legendImage) {
      dist = Math.abs(Math.log(GeoConsts.SCREEN_DOTS_PER_INCH / dpi));
      found_dpi = GeoConsts.SCREEN_DOTS_PER_INCH;
    }
    if (hiDPILegendImages) {
      for (const str_dpi in hiDPILegendImages) {
        const new_dpi = parseFloat(str_dpi);
        const new_dist = Math.abs(Math.log(new_dpi / dpi));
        if (new_dist < dist) {
          dist = new_dist;
          found_dpi = new_dpi;
          legendImage = hiDPILegendImages[str_dpi];
        }
      }
    }
    if (legendImage) {
      return {
        url: legendImage,
        dpi: found_dpi
      };
    }
    return null;
  }

  /**
   * Determines whether the label for a specific server type must be hidden.
   * @returns True if the label must be hidden, false otherwise.
   * @protected
   */
  protected mustHideLabel(serverType: string): boolean {
    const label = this.options?.label;
    return !!label && label[serverType] === false;
  }

  /**
   * Add a classItem to a classes array if the classItem to add is not null.
   * If the classItem have embedded classes, these classes must have classItem. Otherwise, the given
   * classItem will be not added.
   * @protected
   */
  protected addClassItemToArray(classes: MFPLegendClass[], classItem: MFPLegendClass) {
    if (classItem && (classItem.classes ? classItem.classes.length > 0 : true)) {
      classes.push(classItem);
    }
  }

  /**
   * If a Legend item have only one child and the child name is identical to its name, then return
   * only the children (cut one level). Shrink also if both names are null or undefined.
   * Otherwise, return the given legend item.
   * @returns The same legend item or a shrunk one.
   * @protected
   */
  protected tryToSimplifyLegendGroup(legendGroupItem: MFPLegendClass) {
    if (legendGroupItem.classes?.length === 1 && legendGroupItem.classes[0].name === legendGroupItem.name) {
      return legendGroupItem.classes[0];
    }
    return legendGroupItem;
  }
}
