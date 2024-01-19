import GirafeResizableElement from '../../base/GirafeResizableElement';
import { MapFishPrintReportResponse } from '@geoblocks/mapfishprint/src/mapfishprintTypes.ts';

interface MapFishPrintCapabilitiesLayoutAttribute {
  name: string;
  default?: string | boolean | number;
  value?: string;
  type: string;
  clientParams?: {
    [key: string]: MapFishPrintCapabilitiesLayoutAttributeClientParamsElement;
  };
  clientInfo?: MapFishPrintCapabilitiesLayoutAttributeClientInfo;
}

interface MapFishPrintCapabilitiesLayoutAttributeClientInfo {
  dpiSuggestions: number[];
  scales: number[];
  maxDpi: number;
  width: number;
  height: number;
}

interface MapFishPrintCapabilitiesLayoutAttributeClientParamsElement {
  default?: string | boolean | number;
  type: string;
  isArray?: boolean;
  embeddedType?: {
    [key: string]: MapFishPrintCapabilitiesLayoutAttributeClientParamsElement;
  };
}

interface MapFishPrintCapabilitiesLayout {
  attributes: MapFishPrintCapabilitiesLayoutAttribute[];
  name: string;
}

interface MapFishPrintCapabilitiesSMTP {
  enabled: boolean;
}

interface MapFishPrintCapabilities {
  layouts: MapFishPrintCapabilitiesLayout[];
  formats: string[];
  smtp?: MapFishPrintCapabilitiesSMTP;
}

enum PrintStatus {
  Started,
  Success,
  Errored
}

interface PrintElement {
  id: string;
  selectedFormat: string;
  selectedLayoutName: string;
  status: PrintStatus;
  time: string;
  title: string;
  downloadUrl?: string;
  elementTitle?: string;
}

class PrintComponent extends GirafeResizableElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  private printList: PrintElement[] = [];
  private printUrl?: string;
  printFormats: string[] = [];
  selectedFormat?: string;
  layoutsByName: { [name: string]: MapFishPrintCapabilitiesLayout } = {};
  selectedLayoutName?: string;
  scales: number[] = [];
  selectedScale?: number;

  constructor() {
    super('print');
  }

  connectedCallback() {
    this.loadConfig().then(() =>
      this.initializePrint().then(() => {
        this.render();
        this.registerEvents();
      })
    );
  }

  render() {
    super.render();
    this.activateTooltips(false, [800, 0], 'top-end');
    super.girafeTranslate();
  }

  closePanel() {
    this.state.interface.printPanelVisible = false;
  }

  onLayoutChanged(event: Event) {
    const eventValue = (event.target as HTMLInputElement)?.value;
    const clientInfo = this.getClientInfo(eventValue);
    this.updateScales(clientInfo);
    this.state.print.format = [clientInfo.width, clientInfo.height];
    this.render();
  }

  onScaleChanged(event: Event) {
    this.state.print.scale = parseInt((event.target as HTMLInputElement)?.value);
  }

  onFormatChanged(event: Event) {
    this.selectedFormat = (event.target as HTMLInputElement)?.value;
  }

  getStatusClasses(status: PrintStatus): string {
    const baseClasses = 'fa-solid fa-3x ';
    if (status === PrintStatus.Errored) {
      return baseClasses + 'fa-triangle-exclamation';
    }
    if (status === PrintStatus.Success) {
      return baseClasses + 'fa-file-arrow-down';
    }
    return baseClasses + 'fa-circle-notch fa-spin';
  }

  print() {
    const layout = this.selectedLayoutName;
    const format = this.selectedFormat ?? '';
    const scale = this.selectedScale;

    const body = {
      attributes: {
        map: {
          dpi: 254,
          rotation: 0,
          center: [this.state.position.center[0], this.state.position.center[1]],
          projection: this.state.projection,
          scale: scale,
          useNearestScale: false,
          layers: [
            {
              baseURL: 'https://map.geo.bs.ch/mapserv_proxy',
              imageFormat: 'image/png',
              layers: ['Stadt- und Parzellenplan farbig'],
              customParams: {
                TRANSPARENT: 'true',
                ogcserver: 'WMS BS (1)'
              },
              serverType: 'mapserver',
              type: 'wms',
              opacity: 1,
              useNativeAngle: true,
              styles: ['']
            }
          ]
        },
        datasource: [],
        title: this.getTitleValue(),
        comments: this.getCommentValue()
        // maxTitleLength: '130',
        // maxCommentLength: '190'
      },
      format: format,
      lang: 'en',
      layout: layout
    };

    fetch(this.getReportUrl(format), {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json;charset=UTF-8'
      }),
      body: JSON.stringify(body)
    })
      .then((r) => r.json())
      .then((result: MapFishPrintReportResponse) => this.managePrintStatus(result));
  }

  onPrintElementClicked(itemId: string) {
    const printItem = this.getPrintElement(itemId);
    if (printItem?.status === PrintStatus.Success) {
      window.open(printItem.downloadUrl, '_blank');
      return;
    }
    if (printItem?.status === PrintStatus.Errored) {
      const itemIndex = this.printList.findIndex((printItem) => printItem.id === itemId);
      if (itemIndex > -1) {
        this.printList.splice(itemIndex, 1);
        this.render();
      }
    }
  }

  private registerEvents() {
    this.stateManager.subscribe('interface.printPanelVisible', (_oldValue, newValue) => this.togglePanel(newValue));
  }

  private getCapabilitiesUrl(): string {
    return this.printUrl + 'capabilities.json';
  }

  private getReportUrl(format: string): string {
    return this.printUrl + 'report.' + format;
  }

  private getDownloadUrl(result: MapFishPrintReportResponse): string {
    return this.printUrl + result.downloadURL.substring(result.downloadURL.indexOf('/report') + 1);
  }

  private getStatusUrl(result: MapFishPrintReportResponse): string {
    return this.printUrl + result.statusURL.substring(result.statusURL.indexOf('/status') + 1);
  }

  private getPrintElement(itemId: string): PrintElement | undefined {
    return this.printList.find((element) => element.id === itemId);
  }

  private async initializePrint() {
    this.printUrl = this.configManager.Config.print.url;
    this.selectedLayoutName = this.configManager.Config.print.defaultLayout;
    if (!this.printUrl.endsWith('/')) {
      this.printUrl += '/';
    }

    const response = await fetch(this.getCapabilitiesUrl(), { referrer: '' });
    const content: MapFishPrintCapabilities = await response.json();

    this.printFormats = content.formats;
    this.selectedFormat = this.printFormats[0];

    const printLayouts: MapFishPrintCapabilitiesLayout[] = content.layouts;
    printLayouts.forEach((elem) => {
      this.layoutsByName[elem.name] = elem;
    });

    const clientInfo = this.getClientInfo(this.selectedLayoutName);
    this.updateScales(clientInfo);
  }

  private updateScales(clientInfo: MapFishPrintCapabilitiesLayoutAttributeClientInfo) {
    this.scales = clientInfo.scales;
    if (!this.selectedScale || !this.scales.includes(this.selectedScale)) {
      this.selectedScale = this.scales[0];
      this.state.print.scale = this.selectedScale!;
    }
  }

  private getClientInfo(layoutName: string): MapFishPrintCapabilitiesLayoutAttributeClientInfo {
    const layout = this.layoutsByName[layoutName];
    const attributes = layout.attributes.filter((elem) => elem.type === 'MapAttributeValues');
    return attributes[0].clientInfo!;
  }

  private togglePanel(visible: boolean) {
    const parent = (this.panel!.getRootNode() as ShadowRoot).host as HTMLElement;
    if (!visible) {
      this.panel!.style.display = 'none';
      parent.style.display = 'none';
      return;
    }
    this.panel!.style.display = 'block';
    parent.style.display = 'block';
    // Set default print state
    const clientInfo = this.getClientInfo(this.selectedLayoutName!);
    this.state.print.scale = this.selectedScale ?? 0;
    this.state.print.format = [clientInfo.width, clientInfo.height];
  }

  private getTitleValue(): string {
    const titleInput = this.shadow.querySelector('#title') as HTMLInputElement;
    return titleInput?.value || '';
  }

  private getCommentValue(): string {
    const commentInput = this.shadow.querySelector('#comment') as HTMLInputElement;
    return commentInput?.value || '';
  }

  private managePrintStatus(result: MapFishPrintReportResponse) {
    const downloadUrl = this.getDownloadUrl(result);
    const statusUrl = this.getStatusUrl(result);

    const id = 'p-' + result.ref.substring(0, result.ref.indexOf('-'));
    const date = new Date(Date.now());
    const time = date.getHours() + ':' + date.getMinutes();
    this.printList.push({
      id,
      time,
      selectedFormat: this.selectedFormat ?? '',
      selectedLayoutName: this.selectedLayoutName ?? '',
      title: this.getTitleValue(),
      status: PrintStatus.Started
    });
    this.render();

    setTimeout(() => {
      this.checkStatus(id, statusUrl, downloadUrl);
    }, 2000);
  }

  private checkStatus(elementId: string, statusUrl: string, downloadUrl: string) {
    fetch(statusUrl)
      .then((r) => r.json())
      .then((status) => {
        if (!status.done) {
          // We wait maximum 30 seconds
          if (status.elapsedTime > 30000) {
            alert('timeout');
          } else {
            // Continue to wait
            setTimeout(() => {
              this.checkStatus(elementId, statusUrl, downloadUrl);
            }, 2000);
          }
        } else {
          // Print is done.
          switch (status.status) {
            case 'error':
              this.printError(elementId, status.error);
              break;
            case 'finished':
              this.printFinished(elementId, downloadUrl);
          }
        }
      });
  }

  private printFinished(itemId: string, downloadUrl: string) {
    const printItem = this.getPrintElement(itemId);
    if (!printItem) {
      return;
    }
    printItem.status = PrintStatus.Success;
    printItem.downloadUrl = downloadUrl;
    this.render();
  }

  private printError(itemId: string, error: string) {
    const printItem = this.getPrintElement(itemId);
    if (!printItem) {
      return;
    }
    printItem.status = PrintStatus.Errored;
    printItem.elementTitle = error;
    this.render();
  }
}

export default PrintComponent;
