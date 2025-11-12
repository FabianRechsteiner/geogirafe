import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import ServerOgc from '../../models/serverogc';
import { WmsClientDefault } from '../../tools/wms/wmsclient';
import WmtsManager from '../map/tools/wmtsmanager';
import LayerWmsExternal from '../../models/layers/layerwmsexternal';
import LayerWmtsExternal from '../../models/layers/layerwmtsexternal';
import ThemeLayerExternal from '../../models/layers/themelayerexternal';

type SourceType = 'WMS' | 'WMTS' | 'local';
type ExternalLayer = LayerWmsExternal | LayerWmtsExternal;

const MaxLayers = 50;

type PredefinedSource = {
  label: string;
  type: 'WMS' | 'WMTS';
  url: string;
};

class ExternalLayersComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  visible = false;
  loading = false;

  public predefinedSources: PredefinedSource[] = [];

  public get predefinedWmsWmtsSources() {
    return this.predefinedSources.filter((source) => source.type === 'WMS' || source.type === 'WMTS');
  }

  public selectedTab: 'wms_wmts' | 'file' = 'wms_wmts';
  private wmtsManager!: WmtsManager;

  private themeName?: string;
  private externalLayers: ExternalLayer[] = [];
  public filteredLayers: ExternalLayer[] = [];

  public get isFiltered() {
    return this.externalLayers.length > this.filteredLayers.length;
  }

  constructor() {
    super('external-layers');
  }

  render() {
    if (this.visible) {
      super.render();
      super.girafeTranslate();
    } else {
      this.renderEmpty();
    }
  }

  closeWindow() {
    this.state.interface.extLayerPanelVisible = false;
  }

  public setSelectedTab(selectedTab: 'wms_wmts' | 'file') {
    this.selectedTab = selectedTab;
    this.refreshRender();
  }

  public async scanSource(url?: string, sourceType?: SourceType) {
    this.externalLayers = [];
    this.filteredLayers = [];
    this.loading = true;
    this.refreshRender();

    if (!url) {
      url = (this.shadow.getElementById('url') as HTMLInputElement).value;
      if (url.trim().length === 0) {
        return;
      }
    }

    try {
      if (sourceType === 'WMS') {
        await this.scanLayersWMS(url);
      } else if (sourceType === 'WMTS') {
        await this.scanLayersWMTS(url);
      } else {
        // Don't know the type, we try both
        try {
          await this.scanLayersWMS(url);
        } catch {
          await this.scanLayersWMTS(url);
        }
      }
      this.clearFilter();
    } finally {
      this.loading = false;
      this.refreshRender();
    }
  }

  private async scanLayersWMS(url: string) {
    this.themeName = this.parseName(url);
    const server = new ServerOgc(this.themeName, {
      url,
      type: 'other',
      wfsSupport: true,
      urlWfs: url,
      imageType: 'image/png'
    });
    const client = this.context.wmsManager.createClient(WmsClientDefault, server);
    const capabilities: any = await client.getWmsCapabilities();
    if (capabilities?.Service?.Title) {
      this.themeName = capabilities.Service.Title;
    }
    this.externalLayers = capabilities.Capability.Layer.Layer.map(
      (l: any) => new LayerWmsExternal(l.Title, l.Name, server)
    );
  }

  private async scanLayersWMTS(url: string) {
    this.themeName = this.parseName(url);
    const capabilities: any = await this.wmtsManager.getWmtsCapabilities(url);
    this.loading = false;
    if (capabilities?.ServiceIdentification?.Title) {
      this.themeName = capabilities.ServiceIdentification.Title;
    }
    this.externalLayers = capabilities.Contents.Layer.map(
      (l: any) => new LayerWmtsExternal(l.Title, url, l.Identifier)
    );
  }

  public selectLayer(layer: ExternalLayer, forceSelect?: boolean): boolean {
    layer.isSelected = forceSelect ?? !layer.isSelected;
    this.refreshRender();
    if (this.externalLayers.filter((l) => l.isSelected).length > MaxLayers) {
      layer.isSelected = false;
      window.gAlert(
        `For performance reasons, they cannot all be added to the treeview. Please limit the selection to ${MaxLayers} objects.`,
        'Too many layers selected!'
      );
      return false;
    }
    return true;
  }

  private parseName(url: string) {
    const { pathname, host } = new URL(url);
    const basePath = pathname
      .replace(/\/WMTSCapabilities.xml$/, '')
      .replace(/\/1.0.0$/, '')
      .replace(/\/$/, '');
    return `${host}${basePath}`;
  }

  public filterLayers(filter: string) {
    this.filteredLayers = this.externalLayers
      .filter((l) => l.name.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
    this.refreshRender();
  }

  public clearFilter() {
    const filterField = this.shadow.getElementById('layer-search-field') as HTMLInputElement;
    filterField.value = '';
    // Order the layers by name
    this.filteredLayers = [...this.externalLayers].sort((a, b) => a.name.localeCompare(b.name));
    this.refreshRender();
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
    for (const layer of this.filteredLayers) {
      if (!this.selectLayer(layer, true)) {
        break;
      }
    }
    this.refreshRender();
  }

  public deselectVisible() {
    for (const layer of this.filteredLayers) {
      this.selectLayer(layer, false);
    }
    this.refreshRender();
  }

  public deselectAll() {
    for (const layer of this.externalLayers) {
      this.selectLayer(layer, false);
    }
    this.refreshRender();
  }

  public addSelectedLayers() {
    const selectedLayers = this.externalLayers.filter((layer) => layer.isSelected).map((l) => l.clone());
    if (selectedLayers.length === 0) {
      // Nothing to add
      return;
    }

    const theme = new ThemeLayerExternal(this.themeName);
    theme.children = selectedLayers;
    (theme.children as ExternalLayer[]).forEach((l) => {
      l.parent = theme;
    });

    this.context.stateManager.batchChanges(() => {
      this.state.layers.layersList.push(theme);
    });
  }

  public get fileDescription() {
    const selectedFiles = this.getById<HTMLInputElement>('file')?.files;
    if (!selectedFiles || selectedFiles.length == 0) {
      return '';
    }
    return `${selectedFiles[0].name} (${selectedFiles[0].size}b)`;
  }

  public async loadFile() {
    const selectedFiles = this.getById<HTMLInputElement>('file').files;
    if (selectedFiles && selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      await this.context.localFileManager.loadLocalFile(selectedFile);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    const olMap = this.context.mapManager.getMap();
    // TODO REG : User context singleton for the WMTS-Manager
    this.wmtsManager = new WmtsManager(olMap, this.context.stateManager);

    const config = this.context.configManager.Config;
    this.predefinedSources = config.externalLayers?.predefinedSources || [];
    this.render();
    this.subscribe('interface.extLayerPanelVisible', (_, newValue) => {
      this.visible = newValue;
      this.render();
    });
  }
}

export default ExternalLayersComponent;
