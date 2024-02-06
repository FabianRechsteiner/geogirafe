import GirafeResizableElement from '../../base/GirafeResizableElement';
import type { MapFishPrintReportResponse } from '@geoblocks/mapfishprint/src/mapfishprintTypes';
import { EventsKey } from 'ol/events';
import { unByKeyAll } from '../../tools/olUtils';
import { clamp, toDegrees, toRadians } from 'ol/math';

/**
 * Print panel component.
 * Have actions on the print mask and on the map (rotation).
 */
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
  private capabilities?: MapFishPrintCapabilities;
  private readonly eventKeys: EventsKey[] = [];
  private configWantedAttributeNames: string[] = [];
  wantedAttributeNames: string[] = [];
  printFormats: string[] = [];
  selectedFormat?: string;
  layoutsByName: { [name: string]: MapFishPrintCapabilitiesLayout } = {};
  selectedLayoutName?: string;
  scales: number[] = [];
  selectedScale?: number;
  rotation = 0;
  visible = false;

  constructor() {
    super('print');
  }

  connectedCallback() {
    this.render();
    this.registerVisibilityEvents();
  }

  /**
   * Render the component regarding its visibility.
   * Update the state of the print maskVisibility accordingly.
   */
  render() {
    if (this.visible) {
      super.render();
      super.girafeTranslate();
      if (this.capabilities) {
        this.state.print.maskVisible = true;
        this.activateTooltips(false, [800, 0], 'top-end');
        this.registerEvents();
      }
    } else {
      unByKeyAll(this.eventKeys);
      this.state.print.maskVisible = false;
      this.renderEmpty();
    }
  }

  /**
   * Close the panel via the state.
   */
  closePanel() {
    this.state.interface.printPanelVisible = false;
  }

  /**
   * Update the values relative to the layout (attributes, scales, etc.)
   * Set scale and print format in the state.
   * Renders the panel with new info.
   */
  onLayoutChanged(event: Event) {
    const eventValue = (event.target as HTMLInputElement)?.value;
    this.selectedLayoutName = eventValue;
    const clientInfo = this.getClientInfo(eventValue);
    this.updateScales(clientInfo);
    this.updateAvailableAttributes();
    this.state.print.format = [clientInfo.width, clientInfo.height];
    this.render();
  }

  /**
   * Set selected scale in the state.
   */
  onScaleChanged(event: Event) {
    this.state.print.scale = parseInt((event.target as HTMLInputElement)?.value);
  }

  /**
   * Set selected print format.
   */
  onFormatChanged(event: Event) {
    this.selectedFormat = (event.target as HTMLInputElement)?.value;
  }

  /**
   * Sync both rotation inputs and update the map rotation value.
   */
  onRotationChanged(event: Event) {
    const element = event.target as HTMLInputElement;
    this.setRotation(element);
  }

  /**
   * @returns The matching attribute in the selected "capabilities" layout.
   */
  getCapabilitiesAttribute(attributeName: string): MapFishPrintCapabilitiesLayoutAttribute | undefined {
    const attributes = this.layoutsByName[this.selectedLayoutName ?? ''].attributes ?? [];
    return attributes.find((attr) => attr.name === attributeName);
  }

  /**
   * Used to know the matching HTML element.
   * @returns An arbitrary type based on the matching capabilities" attribute.
   */
  getAttributeInputType(attributeName: string) {
    const attribute = this.getCapabilitiesAttribute(attributeName);
    if (attribute?.name === 'comments') return 'textarea';
    if (attribute?.type === 'Number') return 'number';
    if (attribute?.type === 'LegendAttributeValue') return 'checkbox';
    if (attribute?.type === 'Boolean') return 'checkbox';
    return 'text';
  }

  /**
   * @returns html classes regarding the print status.
   */
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

  /**
   * Print the map - currently hardcoded
   */
  print() {
    const layout = this.selectedLayoutName ?? '';
    const format = this.selectedFormat ?? '';
    const scale = this.selectedScale;

    if (this.getCapabilitiesAttributeValue('legend') === 'true') {
      console.log('Legend not implemented yet');
    }

    const mapFishPrintSpec = {
      layout,
      format,
      lang: 'en',
      attributes: {
        map: {
          dpi: 254,
          rotation: this.rotation,
          center: [this.state.position.center[0], this.state.position.center[1]],
          projection: this.state.projection ?? '',
          scale: scale ?? 0,
          useNearestScale: false,
          layers: [
            {
              baseURL: this.configManager.Config.print.url,
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
        datasource: []
        // maxTitleLength: '130',
        // maxCommentLength: '190'
      }
    };

    mapFishPrintSpec.attributes = {
      ...mapFishPrintSpec.attributes,
      ...this.wantedAttributeNames
        .filter((attrName) => attrName !== 'legend')
        .reduce(
          (attributeObj, attrName) => {
            attributeObj[attrName] = this.getCapabilitiesAttributeValue(attrName);
            return attributeObj;
          },
          {} as Record<string, string>
        )
    };

    fetch(this.getReportUrl(format), {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json;charset=UTF-8'
      }),
      body: JSON.stringify(mapFishPrintSpec)
    })
      .then((r) => r.json())
      .then((result: MapFishPrintReportResponse) => this.trackPrintStatus(result));
  }

  /**
   * On print element clicked:
   *  - Download it on success
   *  - Remove it on error.
   *  - Do nothing on pending element.
   */
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

  /**
   * Event about visibility that must be always listened by this component, even hidden.
   * @private
   */
  private registerVisibilityEvents() {
    this.stateManager.subscribe('interface.printPanelVisible', (_oldValue, newValue) => this.togglePanel(newValue));
  }

  /**
   * Event about visibility that must be always listened by this component, even hidden.
   * @private
   */
  private registerEvents() {
    const map = this.state.olMap;
    if (!map) {
      return;
    }
    const view = map.getView();
    const rotationInput = this.shadow.querySelector('#rotationSlider') as HTMLInputElement;
    this.eventKeys.push(
      view.on('change:rotation', () => {
        this.setRotation(rotationInput, Math.round(toDegrees(view.getRotation())));
      })
    );
  }

  /**
   * Sync both rotation inputs and update the map rotation value.
   * @private
   */
  private setRotation(rotationInputElement: HTMLInputElement, value: number | null = null) {
    const slider = rotationInputElement.parentElement?.querySelector('#rotationSlider') as HTMLInputElement;
    const number = rotationInputElement.parentElement?.querySelector('#rotationNumber') as HTMLInputElement;
    const rotation = value ?? parseInt(rotationInputElement.value);
    this.rotation = clamp(rotation, -180, 180);
    slider.value = `${this.rotation}`;
    number.value = `${this.rotation}`;
    this.state.olMap?.getView().setRotation(toRadians(this.rotation));
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

  /**
   * @returns a pending or finished PrintElement by id.
   * @private
   */
  private getPrintElement(itemId: string): PrintElement | undefined {
    return this.printList.find((element) => element.id === itemId);
  }

  /**
   * Load the application config and then fetch the capabilities and initialize the print.
   * @returns the fetched print capabilities or undefined in case of error.
   * @private
   */
  private async initComponentConfig(): Promise<MapFishPrintCapabilities | undefined> {
    await this.loadConfig();
    await this.fetchCapabilities();
    this.initFromCapabilities();
    return this.capabilities;
  }

  /**
   * @returns the fetched print capabilities or undefined in case of error.
   * @private
   */
  private async fetchCapabilities(): Promise<MapFishPrintCapabilities | undefined> {
    this.printUrl = this.configManager.Config.print.url;
    if (!this.printUrl.endsWith('/')) {
      this.printUrl += '/';
    }
    let capabilities: MapFishPrintCapabilities | undefined = undefined;
    try {
      const response = await fetch(this.getCapabilitiesUrl(), { referrer: '' });
      capabilities = await response.json();
    } catch (error) {
      console.error(error);
    }
    this.capabilities = capabilities;
    return capabilities;
  }

  /**
   * Init the print component default values with the print capabilities.
   * @private
   */
  private initFromCapabilities() {
    if (!this.capabilities) {
      return;
    }

    const printLayouts: MapFishPrintCapabilitiesLayout[] = this.capabilities?.layouts ?? [];
    printLayouts.forEach((elem) => {
      this.layoutsByName[elem.name] = elem;
    });

    if (!printLayouts.length) {
      console.error("Can't print without any configured print layouts.");
      this.capabilities = undefined;
      return;
    }

    const config = this.configManager.Config.print;
    this.selectedLayoutName = config.defaultLayout ?? printLayouts[0];
    this.printFormats = this.capabilities?.formats ?? [];
    const isValidDefaultFormat = this.printFormats.includes(config.defaultFormat ?? '');
    this.selectedFormat = isValidDefaultFormat ? config.defaultFormat : this.printFormats[0];

    const clientInfo = this.getClientInfo(this.selectedLayoutName);
    this.updateScales(clientInfo);
    const isValidDefaultScale = this.scales.includes(config.defaultScale ?? -1);
    this.selectedScale = isValidDefaultScale ? config.defaultScale : this.selectedScale;

    if (config.wantedAttributeNames) {
      this.configWantedAttributeNames = config.wantedAttributeNames ?? [];
    }
    this.updateAvailableAttributes();
  }

  /**
   * Set the state's print scale.
   * @private
   */
  private updateScales(clientInfo: MapFishPrintCapabilitiesLayoutAttributeClientInfo) {
    this.scales = clientInfo.scales;
    if (!this.selectedScale || !this.scales.includes(this.selectedScale)) {
      this.selectedScale = this.scales[0];
      this.state.print.scale = this.selectedScale!;
    }
  }

  private updateAvailableAttributes() {
    const layoutAttributes = this.layoutsByName[this.selectedLayoutName ?? '']?.attributes ?? [];
    this.wantedAttributeNames = this.configWantedAttributeNames.filter((wantedAttrName) =>
      layoutAttributes.some((layoutAttr) => layoutAttr.name === wantedAttrName)
    );
  }

  /**
   * @returns The ClientInfo config object from the selected layout.
   * @private
   */
  private getClientInfo(layoutName: string): MapFishPrintCapabilitiesLayoutAttributeClientInfo {
    const layout = this.layoutsByName[layoutName];
    const attributes = layout.attributes.filter((elem) => elem.type === 'MapAttributeValues');
    return attributes[0].clientInfo!;
  }

  /**
   * Set the visibility of the panel
   * Load the component config if it's not initialized.
   * @private
   */
  private async togglePanel(visible: boolean): Promise<void> {
    this.visible = visible;
    const parent = this.host;
    if (!this.visible) {
      parent.style.display = 'none';
      this.render();
      return;
    }

    parent.style.display = 'block';

    if (!this.capabilities) {
      if (!(await this.initComponentConfig())) {
        this.render();
        return;
      }
    }

    // Set default print state to display mask.
    const clientInfo = this.getClientInfo(this.selectedLayoutName!);
    this.state.print.scale = this.selectedScale ?? 0;
    this.state.print.format = [clientInfo.width, clientInfo.height];

    this.render();
  }

  /**
   * @returns the current title element value.
   * @private
   */
  private getCapabilitiesAttributeValue(attrName: string): string {
    const attribute = this.getCapabilitiesAttribute(attrName);
    if (!attribute) {
      return '';
    }
    const type = this.getAttributeInputType(attrName);
    const input = this.shadow.querySelector(`#${attrName}`) as HTMLInputElement;
    if (type === 'checkbox') {
      return `${input.checked}`;
    }
    return input?.value || '';
  }

  /**
   * Set an initial print status element and track the state of the linked print task.
   * @private
   */
  private trackPrintStatus(result: MapFishPrintReportResponse) {
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
      title: this.getCapabilitiesAttributeValue('title') || id,
      status: PrintStatus.Started
    });
    this.render();

    setTimeout(() => {
      this.checkStatus(id, statusUrl, downloadUrl);
    }, 2000);
  }

  /**
   * Loop recursively to check the element status.
   * @private
   */
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

  /**
   * On print finished update the print element with the status and the download url.
   * @private
   */
  private printFinished(itemId: string, downloadUrl: string) {
    const printItem = this.getPrintElement(itemId);
    if (!printItem) {
      return;
    }
    printItem.status = PrintStatus.Success;
    printItem.downloadUrl = downloadUrl;
    this.render();
  }

  /**
   * On print errored update the print element with the status and the error info.
   * @private
   */
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
