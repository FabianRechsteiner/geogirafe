// SPDX-License-Identifier: Apache-2.0
import LayerWms from '../../../models/layers/layerwms';
import WmsLegendHelper from '../../../tools/wms/wmslegendhelper';
import MobileLayerElementComponent from '../layer/component';

class MobileSelectedLayerElementComponent extends MobileLayerElementComponent {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.mobile.css', './style.css'];

  iconUrl: string | null = null;
  legendUrls: Record<string, string> = {};

  /**
   * At the moment only 1 legend URL is supported on mobile
   * TODO REG : Manage multiple legend URLs for the same layer
   */
  get firstLegendUrl(): string | undefined {
    if (Object.keys(this.legendUrls).length > 0) {
      return Object.values(this.legendUrls)[0];
    }
    return undefined;
  }

  wmsLegendHelper!: WmsLegendHelper;

  public constructor() {
    super('layer-selected-mobile');
  }

  protected getCrossOrigin(url: string | null) {
    if (!url) {
      return 'anonymous';
    }

    const hostname = new URL(url).hostname;
    return this.state.oauth.audience.includes(hostname) ? 'use-credentials' : 'anonymous';
  }

  render() {
    if (this.layer instanceof LayerWms) {
      // Manage Legend icons for WMS
      this.iconUrl = this.wmsLegendHelper.getIconUrl(this.layer);
      this.legendUrls = this.wmsLegendHelper.getLegendUrls(this.layer);
    }
    super.render();
  }

  protected override connectedCallback(): void {
    super.connectedCallback();
    this.wmsLegendHelper = new WmsLegendHelper(this.context);
    this.render();
  }
}

export default MobileSelectedLayerElementComponent;
