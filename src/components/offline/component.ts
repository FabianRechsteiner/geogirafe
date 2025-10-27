import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import LayerWmts from '../../models/layers/layerwmts';

class OfflineComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  protected downloadInProgress = false;
  protected downloadProgressValue = 0;

  protected downloadStartZoom?: number;
  protected downloadEndZoom?: number;

  public totalOfflineDataSizeMB = 0;

  constructor() {
    super('offline-mobile');
  }

  registerEvents() {
    this.subscribe('interface.swipeupPanelContent', () => {
      this.render();
    });
    this.subscribe('isOffline', () => {
      super.render();
    });
    this.subscribe('position', () => {
      super.render();
    });

    this.updateTotalSizeMB();
  }

  async updateTotalSizeMB() {
    this.totalOfflineDataSizeMB = await this.context.offlineManager.getTotalSizeMB();
    this.render();
  }

  exportData() {
    const allWmtsLayers = this.getAllWmtsLayers();

    const message = `This will export all the data for the layers [${allWmtsLayers.map((l) => l.name).join(', ')}].`;
    if (confirm(message)) {
      this.downloadInProgress = true;
      this.downloadProgressValue = 0;
      super.render();
      const map = this.context.mapManager.getMap();
      const bbox = map.getView().calculateExtent(map.getSize());
      this.context.offlineManager.exportWMTSTiles(bbox, allWmtsLayers, this.progressCallback.bind(this));
    }
  }

  /**
   * Gets the list of all active WMTS layers
   */
  private getAllWmtsLayers() {
    const basemapLayers =
      this.context.stateManager.state.activeBasemap?.layersList.filter((l) => l instanceof LayerWmts) || [];
    const activeLayers = this.state.layers.layersList.filter((l) => l instanceof LayerWmts && l.active) as LayerWmts[];
    const allWmtsLayers = [...basemapLayers, ...activeLayers];
    return allWmtsLayers;
  }

  progressCallback(progress: number) {
    if (progress === 100) {
      // Done.
      this.downloadInProgress = false;
      this.updateTotalSizeMB();
    } else {
      this.downloadProgressValue = progress;
    }
    super.render();
  }

  connectedCallback() {
    super.connectedCallback();
    this.downloadStartZoom = this.context.configManager.Config.offline?.downloadStartZoom;
    super.render();
    this.registerEvents();
  }

  async clearStores() {
    if (this.totalOfflineDataSizeMB === 0) {
      return;
    }

    const message = 'This will remove the cartographic data locally stored on this device.';
    if (confirm(message)) {
      await this.context.offlineManager.clearBBoxStore();
      await this.context.offlineManager.clearTileStore();
      this.updateTotalSizeMB();
    }
  }
}

export default OfflineComponent;
