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
    this.stateManager.subscribe('isOffline', () => {
      super.render();
    });
    this.stateManager.subscribe('position', () => {
      super.render();
    });
  }

  // TODO REG : Add UT : should work without basemaps
  exportData() {
    // Get the list of all active WMTS Layers
    const basemapLayers = (this.stateManager.state.activeBasemap?.layersList.filter((l) => l instanceof LayerWmts) ||
      []) as LayerWmts[];
    const activeLayers = this.state.layers.layersList.filter((l) => l instanceof LayerWmts && l.active) as LayerWmts[];
    const allWmtsLayers = [...basemapLayers, ...activeLayers];

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
