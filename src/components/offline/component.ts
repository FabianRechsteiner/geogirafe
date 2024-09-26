import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import LayerWmts from '../../models/layers/layerwmts';
import OfflineManager from '../../tools/offline/offlinemanager';
import MapManager from '../../tools/state/mapManager';

class OfflineComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  protected downloadInProgress: boolean = false;
  protected downloadProgressValue: number = 0;
  protected offlineManager: OfflineManager;

  protected downloadStartZoom?: number;
  protected downloadEndZoom?: number;

  constructor() {
    super('themes-mobile');

    this.offlineManager = OfflineManager.getInstance();
    this.configManager.loadConfig().then(() => {
      this.downloadStartZoom = this.configManager.Config.offline?.downloadStartZoom;
    });
  }

  registerEvents() {
    this.subscribe('isOffline', () => {
      super.render();
    });
    this.subscribe('position', () => {
      super.render();
    });
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
    if (progress == 100) {
      // Done.
      this.downloadInProgress = false;
    } else {
      this.downloadProgressValue = progress;
    }
    super.render();
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      super.render();
      this.registerEvents();
    });
  }
}

export default OfflineComponent;
