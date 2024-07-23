import GirafeSingleton from '../../base/GirafeSingleton';
import MapManager from '../state/mapManager';
import StateManager from '../state/statemanager';
import LayerWmts from '../../models/layers/layerwmts';
import { Feature, Map } from 'ol';
import { Extent } from 'ol/extent';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromExtent } from 'ol/geom/Polygon';
import Style from 'ol/style/Style';
import { Stroke } from 'ol/style';
import ConfigManager from '../configuration/configmanager';
import { TileGrid } from 'ol/tilegrid';
import { WMTS } from 'ol/source';

class OfflineManager extends GirafeSingleton {
  private serviceWorker: ServiceWorker | null = null;

  private database?: IDBDatabase;
  private map: Map;
  private stateManager: StateManager;
  private configManager: ConfigManager;

  private get state() {
    return this.stateManager.state;
  }

  private totalLength: number = 0;
  private counter: number = 0;
  private progressCallback?: CallableFunction;

  private storeVersion?: number;
  private dbCacheName?: string;
  private readonly tilesStoreName = 'tiles';
  private readonly bboxStoreName = 'bbox';

  private readonly vectorLayer = new VectorLayer({
    style: new Style({
      stroke: new Stroke({
        color: 'red',
        width: 5
      })
    })
  });

  constructor(type: string) {
    super(type);
    this.stateManager = StateManager.getInstance();
    this.configManager = ConfigManager.getInstance();
    this.map = MapManager.getInstance().getMap();
    this.map.addLayer(this.vectorLayer);
  }

  public initializeOfflineState(isOffline: boolean) {
    this.registerEvents();
    this.stateManager.state.isOffline = isOffline;
  }

  private registerEvents() {
    window.addEventListener('offline', () => {
      this.state.isOffline = true;
    });
    window.addEventListener('online', () => {
      this.state.isOffline = false;
    });
    this.stateManager.subscribe('isOffline', () => {
      this.switchOffline();
    });
  }

  /** Exports all the WMTS tiles for the layers in parameter and store them to local cache */
  public async exportWMTSTiles(bbox: Extent, wmtsLayers: LayerWmts[], progressCallback?: CallableFunction) {
    this.progressCallback = progressCallback;
    await this.saveBoundingBox(bbox);
    const tileUrls = this.getAllTileUrls(bbox, wmtsLayers);
    await this.fetchAndSaveTiles(tileUrls);
  }

  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      console.debug('Opening IndexedDB');
      const request = indexedDB.open(this.dbCacheName!, this.storeVersion);

      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        console.debug('Timeout while opening IndexedDB');
        reject(new Error('Timeout while opening IndexedDB'));
      }, 3000);

      request.onerror = (event) => {
        if (!timedOut) {
          clearTimeout(timeoutId);
          const message = (event.target as IDBOpenDBRequest).error?.message;
          console.debug(`IndexedDB could not be opened : ${message}`);
          reject(new Error(message));
        }
      };

      request.onsuccess = (event) => {
        if (!timedOut) {
          clearTimeout(timeoutId);
          console.debug('IndexedDB is open');
          resolve((event.target as IDBOpenDBRequest).result);
        }
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        // Version migration is necessary.
        // open the indexedDB and create the new structure
        console.debug('Upgrading IndexedDB');
        const database = (event.target as IDBOpenDBRequest).result;
        // First : a store for tiles
        const tilesStore = database.createObjectStore('tiles', { autoIncrement: true });
        tilesStore.createIndex('url', 'url', { unique: true });
        // Second : A store for offline available bbox
        database.createObjectStore('bbox', { autoIncrement: true });
        console.debug('IndexedDB upgraded.');
        resolve(database);
      };
    });
  }

  /** The offline manager works with a ServiceWorker in charge of intercepting
   * the fetch requests and read the data from the local cache if the application
   * is offline. This method defines the servicework object to use.
   * Without this, the offline mode won't work.
   */
  public async setServiceWorker(sw: ServiceWorker | null, storeVersion: number, dbCacheName: string) {
    if (!sw) {
      console.warn("ServiceWorker cannot be initialized. Offline functionalities won't be available.");
      return;
    }
    this.serviceWorker = sw;
    this.storeVersion = storeVersion;
    this.dbCacheName = dbCacheName;
    this.database = await this.openIndexedDB();
    await this.configManager.loadConfig();
    this.serviceWorker.postMessage({
      storeVersion: this.storeVersion,
      dbCacheName: this.dbCacheName,
      tilesStoreName: this.tilesStoreName,
      logLevel: this.configManager.Config.general.logLevel
    });
  }

  public switchOffline() {
    if (this.stateManager.state.isOffline) {
      this.displayBoundBoxes();
    } else if (this.vectorLayer) {
      this.vectorLayer.setSource(null);
    }
  }

  private getAllTileUrls(bbox: Extent, wmtsLayers: LayerWmts[]) {
    const tileUrls: string[] = [];
    for (const wmtsLayer of wmtsLayers) {
      const layerSource = wmtsLayer._olayer?.getSource();
      if (layerSource) {
        const tileGrid = layerSource.getTileGrid();
        if (tileGrid) {
          tileUrls.push(...this.getTileUrlsForWmtsLayer(tileGrid, bbox, layerSource));
        }
      }
    }
    return tileUrls;
  }

  private getTileUrlsForWmtsLayer(tileGrid: TileGrid, bbox: Extent, layerSource: WMTS): string[] {
    const minZoom = tileGrid.getMinZoom();
    const maxZoom = ConfigManager.getInstance().Config.offline?.downloadEndZoom;
    if (!maxZoom) {
      throw new Error('Offline configuration is missing. Cannot download maps for offline usage.');
    }

    const projection = layerSource.getProjection()!;
    const tileUrls: string[] = [];
    for (let z = minZoom; z <= maxZoom; z++) {
      const tileRange = tileGrid.getTileRangeForExtentAndZ(bbox, z);
      for (let x = tileRange.minX; x <= tileRange.maxX; ++x) {
        for (let y = tileRange.minY; y <= tileRange.maxY; ++y) {
          const tileUrl = layerSource.getTileUrlFunction()([z, x, y], window.devicePixelRatio, projection);
          if (tileUrl) {
            tileUrls.push(tileUrl);
          }
        }
      }
    }
    return tileUrls;
  }

  private async fetchAndSaveTiles(tileUrls: string[]) {
    this.totalLength = tileUrls.length;
    console.debug(`Number of Tile to load: ${this.totalLength}`);
    const iterator = tileUrls.values();

    // Use 4 parallel workers to download tiles
    this.counter = 0;
    const workers = Array(4)
      .fill(iterator)
      .map((iterator) => this.doWork(iterator));
    Promise.allSettled(workers).then(() => {
      console.debug('Everything downloaded.');
      if (this.progressCallback) {
        // Last info : 100% done
        this.progressCallback(100);
      }
    });
  }

  private async doWork(iterator: IterableIterator<string>) {
    for (const url of iterator) {
      const response = await fetch(url);
      if (response.ok) {
        response.blob().then((blob) => {
          const transaction = this.database!.transaction([this.tilesStoreName], 'readwrite');
          const store = transaction.objectStore(this.tilesStoreName);
          const index = store.index('url');
          const dbRequest = index.getKey(url);
          dbRequest.onsuccess = () => {
            let request;
            if (dbRequest.result) {
              const key = dbRequest.result;
              request = store.put({ url: url, data: blob }, key);
            } else {
              request = store.put({ url: url, data: blob });
            }

            request.onsuccess = () => {
              if (this.progressCallback) {
                this.progressCallback(Math.round((this.counter * 100) / this.totalLength));
              }
              console.debug(`${this.counter++}/${this.totalLength} Tile ${url} added.`);
            };
            request.onerror = () => {
              console.error(`Error while saving tile ${url}`);
            };
          };
        });
      }
    }
  }

  private async saveBoundingBox(bbox: Extent) {
    if (this.database === undefined) {
      this.database = await this.openIndexedDB();
    }

    // Save bbox to the store
    const transaction = this.database.transaction([this.bboxStoreName], 'readwrite');
    const store = transaction.objectStore(this.bboxStoreName);
    const request = store.put(bbox);
    request.onsuccess = () => {
      console.debug('BBOX Added to store');
    };
    request.onerror = () => {
      console.error('Error while saving bbox');
    };
  }

  public async displayBoundBoxes() {
    if (this.database === undefined) {
      this.database = await this.openIndexedDB();
    }

    // Read bbox for offline tiles
    const transaction = this.database.transaction([this.bboxStoreName], 'readonly');
    const store = transaction.objectStore(this.bboxStoreName);
    const request = store.getAll();
    request.onsuccess = () => {
      const vectorSource = new VectorSource();
      if (request.result) {
        for (const bbox of request.result) {
          const feature = new Feature({
            geometry: fromExtent(bbox)
          });
          vectorSource.addFeature(feature);
        }
      }
      this.vectorLayer.setSource(vectorSource);
    };
    request.onerror = () => {
      console.error('Error while saving bbox');
    };
  }
}

export default OfflineManager;
