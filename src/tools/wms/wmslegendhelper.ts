// SPDX-License-Identifier: Apache-2.0
import { ImageWMS } from 'ol/source';
import LayerWms from '../../models/layers/layerwms';
import IGirafeContext from '../context/icontext';

export default class WmsLegendHelper {
  private readonly context: IGirafeContext;

  public constructor(context: IGirafeContext) {
    this.context = context;
  }

  public getIconUrl(layer: LayerWms) {
    // Manage Icon URL
    if (layer.iconUrl) {
      // A custom legend icon has been defined and can be displayed
      return layer.iconUrl;
    }
    if (layer.legendRule) {
      // We need to get the legend icon URL from WMS
      return Object.values(this.getLegendImageUrlFromWms(layer, true))[0];
    }

    // All other cases, we do not have any icon for the layer
    // => A simple selection icon will be rendered
    return null;
  }

  public getLegendUrls(layer: LayerWms): Record<string, string> {
    if (layer.legend) {
      if (layer.legendImage) {
        const legends: Record<string, string> = {};
        legends[layer.layers!] = layer.legendImage;
        return legends;
      }
      // Otherwise, calculate the WMS Legend URLs;
      return this.getLegendImageUrlFromWms(layer, false);
    }

    // No legend
    return {};
  }

  private getLegendImageUrlFromWms(layer: LayerWms, iconOnly: boolean): Record<string, string> {
    const legends: Record<string, string> = {};
    for (const l of layer.layers!.split(',')) {
      const hostname = new URL(layer.ogcServer.url).hostname;
      const wmsSource = new ImageWMS({
        url: layer.ogcServer.url,
        params: { LAYERS: l },
        ratio: 1,
        crossOrigin: this.context.stateManager.state.oauth.audience.includes(hostname) ? 'use-credentials' : 'anonymous'
      });

      let graphicUrl = wmsSource.getLegendUrl(this.context.stateManager.state.position.resolution);
      if (!graphicUrl) {
        console.error(`The URL for legend of layer ${l} could not be calculated.`);
        legends[l] = '';
        continue;
      }

      if (!graphicUrl.toLowerCase().includes('sld_version')) {
        // Add SLD_Version (it is mandatory, but openlayers do not seems to set it in the URL)
        graphicUrl += '&SLD_Version=1.1.0';
      }

      if (iconOnly) {
        if (layer.legendRule) {
          graphicUrl += '&RULE=' + encodeURIComponent(layer.legendRule);
        }
        graphicUrl += '&HEIGHT=' + this.context.configManager.Config.treeview.defaultIconSize.height;
        graphicUrl += '&WIDTH=' + this.context.configManager.Config.treeview.defaultIconSize.width;
      }

      if (layer.ogcServer.type === 'qgisserver') {
        graphicUrl += '&LAYERTITLE=False';
      }

      legends[l] = graphicUrl;
    }

    return legends;
  }
}
