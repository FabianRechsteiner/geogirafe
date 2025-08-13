import { getUid } from 'ol/util';
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import MapManager from '../../tools/state/mapManager';
import WmsManager from '../../tools/wms/wmsmanager';
import WmtsManager from '../map/tools/wmtsmanager';
import ThemeLayer from '../../models/layers/themelayer';
import BaseLayer from '../../models/layers/baselayer';
import LayerWms from '../../models/layers/layerwms';
import LayerWmts from '../../models/layers/layerwmts';
import ServerOgc from '../../models/serverogc';
import { WmsClientDefault } from '../../tools/wms/wmsclient';

enum SourceTypes {WMS, WMTS, predefined};

const MIN_EXTERNAL_ID = 999999999;

class ExtLayerComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  visible = false;
  loading = true;

  static readonly SourceTypes = SourceTypes;
  readonly SourceTypes = ExtLayerComponent.SourceTypes;

  sourceType: SourceTypes = SourceTypes.predefined; // WMS;
  wmtsManager!: WmtsManager;

  themeName: string | undefined = undefined;
  layers: BaseLayer[] = [];
  selectedLayers: {[key: number]: boolean} = {};

  private readonly mapManager: MapManager;

  constructor() {
    super('ext-layer');

    this.mapManager = MapManager.getInstance();
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
    const url = this.getById<HTMLInputElement>('url').value
    if (this.sourceType === this.SourceTypes.WMS) {
      this.scanLayersWMS(url);
    }
    else if (this.sourceType === this.SourceTypes.WMTS) {
      this.scanLayersWMTS(url);
    }
  }

  public toggle(id: number) {
    if (this.selectedLayers[id]) {
      this.selectedLayers[id] = false
    } else {
      this.selectedLayers[id] = true
    }
    this.render();
  }

  private parseName(url: string) {
    const { pathname, host } = new URL(url);
    const basePath = pathname.replace(/\/WMTSCapabilities.xml$/, '').replace(/\/1.0.0$/, '').replace(/\/$/, '');
    return `${host}${basePath}`
  }

  private getId(layer: BaseLayer) {
    const uid = getUid(layer)
    if (!(uid in this.stateManager.state.layers.extLayerIds)) {
      this.stateManager.state.layers.extLayerIds[uid] = Math.max(MIN_EXTERNAL_ID, ...Object.values(this.stateManager.state.layers.extLayerIds)) + 1;
    }
    return this.stateManager.state.layers.extLayerIds[uid];
  }

  public async scanLayersWMS(url: string) {
    this.themeName = this.parseName(url);
    if (this.themeName === undefined) {
      return;
    }
    const wmsManager = WmsManager.getInstance();
    const server = new ServerOgc(this.themeName, {url, type: "other", wfsSupport: false, imageType: "image/png"});
    const client = wmsManager.createClient(WmsClientDefault, server);
    const capabilities: any = await client.getWmsCapabilities();
    this.layers = capabilities.Capability.Layer.Layer.map((l: any) => new LayerWms(this.getId(l), l.Title, 0, server, {layers: l.Name}));
    this.selectedLayers = {};
    this.render();
  }

  public async scanLayersWMTS(url: string) {
    this.themeName = this.parseName(url);
    if (this.themeName === undefined) {
      return;
    }
    const capabilities: any = await this.wmtsManager.getWmtsCapabilities(url)
    this.layers = capabilities.Contents.Layer.map((l: any) => new LayerWmts(this.getId(l), l.Title, 0, url, l.Identifier));
    this.selectedLayers = {};
    this.render();
  }

  public addSelectedLayers() {
    const extTheme = new ThemeLayer(99999, this.themeName || 'ThemeExterne', 0);
    extTheme.children = this.layers.filter(l => this.selectedLayers[l.id]);
    const themeToAdd = extTheme.clone();
    themeToAdd.children.forEach(l => {l.parent = extTheme});
    this.state.layers.layersList.push(themeToAdd);
  }

  public setSourceType(newSourceType: SourceTypes) {
    this.sourceType = newSourceType;
    this.layers = [];
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
