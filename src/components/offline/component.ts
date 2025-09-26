import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import LayerWmts from '../../models/layers/layerwmts';
import OfflineManager from '../../tools/offline/offlinemanager';
import MapManager from '../../tools/state/mapManager';

class OfflineComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  protected downloadInProgress = false;
  protected downloadProgressValue = 0;
  protected offlineManager: OfflineManager;

  protected downloadStartZoom?: number;
  protected downloadEndZoom?: number;

  public totalOfflineDataSizeMB = 0;

  constructor() {
    super('themes-mobile');
    this.offlineManager = OfflineManager.getInstance();
    console.log(this.state);
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
    this.totalOfflineDataSizeMB = await this.offlineManager.getTotalSizeMB();
    this.render();
  }

  exportData() {
    const allWmtsLayers = this.getAllWmtsLayers();

    const message = `This will export all the data for the layers [${allWmtsLayers.map((l) => l.name).join(', ')}].`;
    if (confirm(message)) {
      this.downloadInProgress = true;
      this.downloadProgressValue = 0;
      super.render();
      const map = MapManager.getInstance().getMap();
      const bbox = map.getView().calculateExtent(map.getSize());
      this.offlineManager.exportWMTSTiles(bbox, allWmtsLayers, this.progressCallback.bind(this));
    }
  }

  /**
   * Gets the list of all active WMTS layers
   */
  private getAllWmtsLayers() {
    const basemapLayers = this.stateManager.state.activeBasemap?.layersList.filter((l) => l instanceof LayerWmts) || [];
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
    this.loadConfig().then(() => {
      this.downloadStartZoom = this.configManager.Config.offline?.downloadStartZoom;
      super.render();
      this.registerEvents();
    });
  }

  async clearStores() {
    if (this.totalOfflineDataSizeMB === 0) {
      return;
    }

    const message = 'This will remove the cartographic data locally stored on this device.';
    if (confirm(message)) {
      await this.offlineManager.clearBBoxStore();
      await this.offlineManager.clearTileStore();
      this.updateTotalSizeMB();
    }
  }
}

export default OfflineComponent;
