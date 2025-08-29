import { getUid } from 'ol/util';
import I18nManager from '../../tools/i18n/i18nmanager';
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import ConfigManager from '../../tools/configuration/configmanager';
import MapManager from '../../tools/state/mapManager';
import WmsManager from '../../tools/wms/wmsmanager';
import WmtsManager from '../map/tools/wmtsmanager';
import ThemeLayer from '../../models/layers/themelayer';
import BaseLayer from '../../models/layers/baselayer';
import LayerWms from '../../models/layers/layerwms';
import LayerWmts from '../../models/layers/layerwmts';
import ServerOgc from '../../models/serverogc';
import { WmsClientDefault } from '../../tools/wms/wmsclient';

export type SourceType = 'auto_WMTS' | 'WMS' | 'WMTS' | 'predefined';

const MIN_EXTERNAL_ID = 999999999;

class ExtLayerComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  visible = false;
  loading = false;

  public readonly i18nManager: I18nManager;
  private readonly enabled_types: SourceType[];
  // @ts-ignore: unused variable => used in template.html
  private readonly predefined_sources;

  sourceType: SourceType;
  wmtsManager!: WmtsManager;

  themeName: string | undefined = undefined;
  allLayers: BaseLayer[] = [];
  layers: BaseLayer[] = [];
  selectedLayers: { [key: number]: boolean } = {};

  isFiltered: boolean = false;

  private readonly mapManager: MapManager;

  constructor() {
    super('ext-layer');

    this.i18nManager = I18nManager.getInstance();
    this.mapManager = MapManager.getInstance();

    const config = ConfigManager.getInstance().Config;
    this.enabled_types = config.external_layers?.enabled_types || ['WMS', 'WMTS'];
    this.predefined_sources = config.external_layers?.predefined_sources || [];
    this.sourceType = config.external_layers?.default_type || this.enabled_types[0] || 'predefined';
  }

  render() {
    super.girafeTranslate();
    this.visible ? super.render() : this.renderEmpty();
    const olMap = this.mapManager.getMap();
    this.wmtsManager = new WmtsManager(olMap);
  }

  closeWindow() {
    this.state.interface.extLayerPanelVisible = false;
  }

  public scanLayers() {
    const url = this.getById<HTMLInputElement>('url').value;
    this.scanExtLayers(this.sourceType, url);
  }

  public scanExtLayers(source_type: SourceType, url: string) {
    if (source_type === 'auto_WMTS') {
      if (url.includes('WMTS')) {
        source_type = 'WMTS';
      } else {
        source_type = 'WMS';
      }
    }
    if (source_type === 'WMS') {
      this.scanLayersWMS(url);
    } else if (source_type === 'WMTS') {
      this.scanLayersWMTS(url);
    }
  }

  public toggle(id: number) {
    if (this.selectedLayers[id]) {
      this.selectedLayers[id] = false;
    } else {
      this.selectedLayers[id] = true;
    }
    this.render();
  }

  private parseName(url: string) {
    const { pathname, host } = new URL(url);
    const basePath = pathname
      .replace(/\/WMTSCapabilities.xml$/, '')
      .replace(/\/1.0.0$/, '')
      .replace(/\/$/, '');
    return `${host}${basePath}`;
  }

  private getId(layer: BaseLayer) {
    // generate an unused integer id greater than MIN_EXTERNAL_ID for each layer uid
    // beacause the layer model requires integer ids
    const uid = getUid(layer);
    if (!(uid in this.stateManager.state.layers.extLayerIds)) {
      this.stateManager.state.layers.extLayerIds[uid] =
        Math.max(MIN_EXTERNAL_ID, ...Object.values(this.stateManager.state.layers.extLayerIds)) + 1;
    }
    return this.stateManager.state.layers.extLayerIds[uid];
  }

  public async scanLayersWMS(url: string) {
    this.themeName = this.parseName(url);
    const wmsManager = WmsManager.getInstance();
    const server = new ServerOgc(this.themeName, { url, type: 'other', wfsSupport: true, urlWfs: url, imageType: 'image/png' });
    const client = wmsManager.createClient(WmsClientDefault, server);
    this.allLayers = [];
    this.layers = [];
    this.selectedLayers = {};
    this.loading = true;
    this.render();
    const capabilities: any = await client.getWmsCapabilities();
    this.loading = false;
    if (capabilities?.Service?.Title) {
      this.themeName = capabilities.Service.Title;
    }
    this.allLayers = capabilities.Capability.Layer.Layer.map(
      (l: any) => new LayerWms(this.getId(l), l.Title, 0, server, { layers: l.Name, queryable: true, legend: true })
    );
    this.layers = [...this.allLayers];
    this.selectedLayers = {};
    if (this.isFiltered) this.clearFilter();
    this.render();
  }

  public async scanLayersWMTS(url: string) {
    this.themeName = this.parseName(url);
    this.allLayers = [];
    this.layers = [];
    this.selectedLayers = {};
    this.loading = true;
    this.render();
    const capabilities: any = await this.wmtsManager.getWmtsCapabilities(url);
    this.loading = false;
    if (capabilities?.ServiceIdentification?.Title) {
      this.themeName = capabilities.ServiceIdentification.Title;
    }
    this.allLayers = capabilities.Contents.Layer.map(
      (l: any) => new LayerWmts(this.getId(l), l.Title, 0, url, l.Identifier)
    );
    this.layers = [...this.allLayers];
    this.selectedLayers = {};
    if (this.isFiltered) this.clearFilter();
    this.render();
  }

  public filterLayers(filter: string) {
    this.layers = this.allLayers.filter((l) => l.name.toLowerCase().includes(filter.toLowerCase()));
    this.isFiltered = true;
    this.render();
  }

  public clearFilter() {
    const filterField = this.shadow.getElementById('layer-search-field') as HTMLInputElement;
    filterField.value = '';
    this.layers = [...this.allLayers];
    this.isFiltered = false;
    this.render();
  }

  public typeUrl() {
    const urlField = this.shadow.getElementById('url') as HTMLInputElement;
    const urlReset = this.shadow.getElementById('clear-url') as HTMLInputElement;
    if (urlField.value === '') {
      urlReset.classList.add('hidden');
    } else {
      urlReset.classList.remove('hidden');
    }
  }

  public clearUrl() {
    const urlField = this.shadow.getElementById('url') as HTMLInputElement;
    urlField.value = '';
    const urlReset = this.shadow.getElementById('clear-url') as HTMLInputElement;
    urlReset.classList.add('hidden');
    this.render();
  }

  public selectVisible() {
    this.layers.forEach((l) => (this.selectedLayers[l.id] = true));
    this.render();
  }

  public deselectVisible() {
    this.layers.forEach((l) => (this.selectedLayers[l.id] = false));
    this.render();
  }

  public deselectAll() {
    this.selectedLayers = {};
    this.render();
  }

  public addSelectedLayers() {
    const extTheme = new ThemeLayer(99999, this.themeName || 'ThemeExterne', 0);
    extTheme.children = this.allLayers.filter((l) => this.selectedLayers[l.id]);
    extTheme.children.forEach((l) => {
      l.parent = extTheme;
      l.isDefaultChecked = true;
    });
    const themeToAdd = extTheme.clone();
    this.state.layers.layersList.push(themeToAdd);
  }

  public setSourceType(newSourceType: SourceType) {
    this.sourceType = newSourceType;
    this.allLayers = [];
    this.layers = [];
    this.selectedLayers = {};
    this.render();
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.subscribe('interface.extLayerPanelVisible', (_, newValue) => {
        this.visible = newValue;
        this.render();
      });
    });
  }
}

export default ExtLayerComponent;
