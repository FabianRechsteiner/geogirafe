import type { EventsKey } from 'ol/events';
import type { MFPReportResponse } from '@geoblocks/mapfishprint';
import type {
  MFPCapabilities,
  MFPCapabilitiesLayout,
  MFPCapabilitiesLayoutAttribute,
  MFPCapabilitiesLayoutAttributeClientInfo,
  MFPPrintDatasource
} from './tools/MFPTypes.ts';
import type { EncodeLegendOptions, MFPLegendClass } from './tools/MFPLegendEncoder.ts';
import type { Callback } from '../../tools/state/statemanager.ts';

import PrintManager from './tools/PrintManager.ts';
import PrintMaskManager from './tools/printMaskManager.ts';
import { toDegrees, toRadians } from 'ol/math';
import { MapManager, I18nManager } from '../../tools/main.ts';
import GirafeResizableElement from '../../base/GirafeResizableElement';
import { deleteFeatureOlParams, unByKeyAll } from '../../tools/olutils.ts';
import { intersects } from 'ol/extent';
import { padNumber } from 'ol/string';

/** Represents the status of a printing process. */
enum PrintStatus {
  Started,
  Success,
  Errored
}

/** Represents an ongoing or finished print element. */
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

/**
 * Print panel component.
 * Read print capabilities and generate options from it.
 * Be able to print the content on the map, based on the layer tree and the OL map.
 * Have actions on the print mask and on the map (rotation).
 */
class PrintComponent extends GirafeResizableElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  private default_dpi = 96;
  private default_scale = 10000;
  private default_resolution = 100;
  private default_format = 'pdf';

  private readonly i18nManager: I18nManager;
  private readonly mapManager: MapManager;
  private readonly eventsCallbacks: Callback[] = [];
  private readonly eventKeys: EventsKey[] = [];
  private printManager?: PrintManager;
  private printList: PrintElement[] = [];
  private printUrl?: string;
  private capabilities?: MFPCapabilities;
  private configAttributeNames: string[] = [];
  private printMaskManager?: PrintMaskManager;
  attributeNames: string[] = [];
  printFormats: string[] = [];
  layouts: MFPCapabilitiesLayout[] = [];
  selectedLayout?: MFPCapabilitiesLayout;
  scales: number[] = [];
  dpis: number[] = [];
  visible = false;

  constructor() {
    super('print');
    this.mapManager = MapManager.getInstance();
    this.i18nManager = I18nManager.getInstance();
  }

  connectedCallback() {
    this.render();
    this.registerVisibilityEvents();
  }

  /**
   * Render the component regarding its visibility.
   * Fetch the print capabilities at first rendering, then render the print mask too and register to events.
   */
  render() {
    this.visible ? this.renderComponent() : this.renderEmptyComponent();
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
    this.selectedLayout = this.getCapabilitiesLayout(eventValue);
    const clientInfo = this.getClientInfo();
    this.updateScales(clientInfo);
    this.updateDpis(clientInfo);
    this.updateAvailableAttributes();
    this.state.print.pageSize = [clientInfo.width, clientInfo.height];
    this.render();
  }

  /**
   * Set selected scale in the state and update the mask.
   */
  onScaleChanged(event: Event) {
    this.state.print.scale = parseInt((event.target as HTMLInputElement)?.value);
    this.printMaskManager?.zoomToScale(this.state.print.scale);
  }

  /**
   * @Returns the current print scale.
   */
  getSelectedScale(): number | null {
    return this.state.print.scale;
  }

  /**
   * @Returns the current print format value.
   */
  getSelectedFormat(): string | null {
    return this.state.print.format;
  }

  /**
   * @Returns the current print dpi value.
   */
  getSelectedDpi(): number | null {
    return this.state.print.dpi;
  }

  /**
   * Set selected print format.
   */
  onFormatChanged(event: Event) {
    this.state.print.format = (event.target as HTMLInputElement)?.value;
  }

  /**
   * Set selected dpi format.
   */
  onDpiChanged(event: Event) {
    const value = (event.target as HTMLInputElement)?.value;
    this.state.print.dpi = value ? parseInt(value) : this.default_dpi;
  }

  /**
   * @returns {number} The rotation angle in degrees, from the map.
   */
  getRotation(): number {
    return toDegrees(this.mapManager.getMap().getView().getRotation());
  }

  /**
   * Sync both rotation inputs and update the map rotation value.
   */
  onInputRotationChanged(event: Event) {
    const element = event.target as HTMLInputElement;
    this.setRotation(element);
  }

  /**
   * @returns The matching attribute in the selected "capabilities" layout.
   */
  getCapabilitiesAttribute(attributeName: string): MFPCapabilitiesLayoutAttribute | undefined {
    const attributes = this.selectedLayout?.attributes ?? [];
    return attributes.find((attr) => attr.name === attributeName);
  }

  /**
   * Used to know the matching HTML element.
   * @returns An arbitrary type based on the matching "capabilities" attribute.
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
   * Legacy fix for attrName i18n.
   */
  attrNameForI18n(attrName: string): string {
    if (attrName === 'legend') return 'Legend';
    return attrName;
  }

  /**
   * @returns html classes regarding the print status.
   */
  getStatusClasses(status: PrintStatus): string {
    const baseClasses = 'status fa-solid fa-3x ';
    if (status === PrintStatus.Errored) {
      return baseClasses + 'error fa-triangle-exclamation';
    }
    if (status === PrintStatus.Success) {
      return baseClasses + 'success fa-file-arrow-down';
    }
    return baseClasses + 'pending fa-circle-notch fa-spin';
  }

  /**
   * Prints the current map state regarding every print options.
   * Can add datasource (based on selection) and a legend.
   * The status will be tracked until finished.
   */
  async print() {
    const customAttributes = this.getCustomAttributes();

    const spec = await this.printManager?.encode({
      mapManager: this.mapManager,
      i18nManager: this.i18nManager,
      state: this.state,
      scale: this.getSelectedScale() ?? this.default_scale,
      printResolution: this.mapManager.getMap().getView().getResolution() ?? this.default_resolution,
      pageSize: this.state.print.pageSize ?? [],
      dpi: this.getSelectedDpi() ?? this.default_dpi,
      layout: this.selectedLayout?.name ?? '',
      format: this.getSelectedFormat() ?? this.default_format,
      customAttributes
    });
    if (!spec) {
      console.error('Unable to create print spec');
      return;
    }
    this.printManager?.requestReport(this.printUrl ?? '', spec).then((result) => this.trackPrintStatus(result));
  }

  /**
   * On print element clicked:
   *  - Download it on success
   *  - Do nothing otherwise element.
   */
  onPrintElementClicked(itemId: string) {
    const printItem = this.getPrintElement(itemId);
    if (printItem?.status !== PrintStatus.Success) {
      return;
    }
    window.open(printItem.downloadUrl, '_blank');
  }

  /**
   * Removes the print element with the specified itemId from the printList array.
   * Cancel the print if is it not finished.
   */
  onCancelPrintElementClicked(itemId: string) {
    const itemIndex = this.printList.findIndex((printItem) => printItem.id === itemId);
    if (itemIndex < 0) {
      return;
    }
    const printItem = this.printList[itemIndex];
    if (printItem.status === PrintStatus.Started) {
      this.printManager?.cancelReport(this.printUrl!, printItem.id);
    }
    this.printList.splice(itemIndex, 1);
    this.render();
  }

  /**
   * Renders the component by calling the necessary methods.
   * @private
   */
  private renderComponent() {
    super.render();
    super.girafeTranslate();
    this.activateTooltips(false, [800, 0], 'top-end');
    this.renderComponentCapabilitiesPart();
  }

  /**
   * Renders the component capabilities part, like the mask and the capabilities related elements.
   * Loads the capabilities and the initial config if not already loaded.
   * @private
   */
  private async renderComponentCapabilitiesPart() {
    if (!this.capabilities) {
      if (!(await this.initComponentConfig())) {
        return;
      }
      // Render again, with capabilities and related elements well set.
      this.render();
      return;
    }
    this.updateInputRotationFromMap();
    this.state.print.maskVisible = true;
    this.printMaskManager = new PrintMaskManager(this.mapManager.getMap());
    this.printMaskManager?.setPossibleScales(this.scales);
    this.setupPrintManager();
    this.registerEvents();
  }

  /**
   * Renders an empty component when it's not visible.
   * Destroy not-visibility related events.
   * @private
   */
  private renderEmptyComponent() {
    this.printMaskManager?.destroy();
    unByKeyAll(this.eventKeys);
    this.eventKeys.length = 0;
    this.stateManager.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;
    this.renderEmpty();
  }

  /**
   * Sets up the print manager if it doesn't already exist.
   * @private
   */
  private setupPrintManager() {
    if (!this.printManager) {
      this.printManager = new PrintManager();
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
   * Listen events that must be listened if the print panel is visible.
   * @private
   */
  private registerEvents() {
    const view = this.mapManager.getMap().getView();
    this.eventKeys.push(
      view.on('change:rotation', () => {
        this.updateInputRotationFromMap();
      })
    );
    this.eventsCallbacks.push(
      this.stateManager.subscribe('print.scale', (_oldVal, newVal) => {
        const scaleElement = this.shadow.querySelector('#scale') as HTMLInputElement;
        scaleElement.value = newVal;
      })
    );
  }

  /**
   * Set the visibility of the panel.
   * @private
   */
  private async togglePanel(visible: boolean): Promise<void> {
    this.visible = visible;
    const parent = this.host;
    parent.style.display = this.visible ? 'block' : 'none';
    this.render();
  }

  /**
   * Update the input rotation value from the map rotation value.
   */
  private updateInputRotationFromMap() {
    const rotationInputElement = this.shadow.querySelector('#rotationSlider') as HTMLInputElement;
    let rotation = Math.round(this.getRotation());
    if (rotation > 180) {
      rotation -= 360;
    }
    if (rotation < -180) {
      rotation += 360;
    }
    this.setRotation(rotationInputElement, rotation);
  }

  /**
   * Sync both rotation inputs and update the map rotation value (except if the value is
   * provided, meaning the map already has the right rotation).
   * @private
   */
  private setRotation(rotationInputElement: HTMLInputElement, mapRotationValue: number | null = null) {
    const slider = rotationInputElement.parentElement?.querySelector('#rotationSlider') as HTMLInputElement;
    const number = rotationInputElement.parentElement?.querySelector('#rotationNumber') as HTMLInputElement;
    const rotation = mapRotationValue ?? parseInt(rotationInputElement.value);
    slider.value = `${rotation}`;
    number.value = `${rotation}`;
    if (!mapRotationValue) {
      this.mapManager.getMap().getView().setRotation(toRadians(rotation));
    }
  }

  /**
   * @returns The URL to fetch the print capabilities.
   * @private
   */
  private getCapabilitiesUrl(): string {
    return this.printUrl + '/capabilities.json';
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
  private async initComponentConfig(): Promise<MFPCapabilities | undefined> {
    await this.loadConfig();
    await this.fetchCapabilities();
    this.initFromCapabilities();
    return this.capabilities;
  }

  /**
   * @returns the fetched print capabilities or undefined in case of error.
   * @private
   /*/
  private async fetchCapabilities(): Promise<MFPCapabilities | undefined> {
    this.printUrl = this.configManager.Config.print.url;
    if (this.printUrl.endsWith('/')) {
      this.printUrl = this.printUrl.slice(0, -1);
    }
    let capabilities: MFPCapabilities | undefined = undefined;
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

    const printLayouts = this.capabilities?.layouts ?? [];

    if (!printLayouts.length) {
      console.error("Can't print without any configured print layouts.");
      this.capabilities = undefined;
      return;
    }

    const config = this.configManager.Config.print;
    this.initLayouts();
    const selectedLayout = this.getCapabilitiesLayout(config.defaultLayout ?? '');
    this.selectedLayout = selectedLayout ?? printLayouts[0];
    this.initFormats();
    const clientInfo = this.getClientInfo();
    this.updateScales(clientInfo);
    this.updateDpis(clientInfo);
    this.state.print.pageSize = [clientInfo.width, clientInfo.height];

    if (config.attributeNames) {
      this.configAttributeNames = config.attributeNames;
    }
    this.updateAvailableAttributes();
  }

  /**
   * Initializes the print formats and default selected format based on the configuration.
   * @private
   */
  private initFormats() {
    this.initPrintFormats();
    this.initDefaultFormat();
  }

  /**
   * Initializes the print formats based on the configuration.
   * Removes formats not proposed by MFP.
   * @private
   */
  private initPrintFormats() {
    const configFormats = this.configManager.Config.print.formats ?? [];
    this.printFormats = configFormats.filter((format) => {
      if (this.capabilities?.formats.includes(format)) {
        return true;
      }
      console.warn(`Format ${format} is not supported.`);
      return false;
    });
  }

  /**
   * Initializes the default selected print format based on the configuration.
   * @private
   */
  private initDefaultFormat() {
    const config = this.configManager.Config.print;
    if (config.defaultFormat) {
      if (this.printFormats.includes(config.defaultFormat)) {
        this.state.print.format = config.defaultFormat;
        return;
      }
      console.warn('Configured format does not exist: ', config.defaultFormat);
    }
    this.state.print.format = this.printFormats.length ? this.printFormats[0] : this.default_format;
  }

  /**
   * Whitelist the available layouts with the config.print.layouts, or allows every of them.
   */
  private initLayouts() {
    let layouts = this.capabilities?.layouts;
    const configLayouts = this.configManager.Config.print.layouts;
    if (configLayouts && configLayouts.length > 0) {
      // Alerts user if a configured layout doesn't exist.
      configLayouts.forEach((layoutName) => {
        if (!layouts?.find((layout) => layout.name === layoutName)) {
          console.warn('Configured layout does not exist: ', layoutName);
        }
      });
      // Filter layouts with the config.
      layouts = layouts?.filter((layout) => configLayouts.includes(layout.name));
    }
    this.layouts = layouts ?? [];
  }

  /**
   * @returns The capabilities layout with the specified name, or undefined if not found.
   */
  private getCapabilitiesLayout(layoutName: string): MFPCapabilitiesLayout | undefined {
    return this.layouts.find((layout) => layout.name === layoutName);
  }

  /**
   * Set the available print scales for this layout.
   * The available scales are whitelisted with the config.print.scales (if any).
   * @private
   */
  private updateScales(clientInfo: MFPCapabilitiesLayoutAttributeClientInfo) {
    let scales = [...clientInfo.scales];
    const configScales = this.configManager.Config.print.scales;
    if (configScales && configScales.length > 0) {
      configScales.forEach((configScale) => {
        if (!scales?.find((scale) => scale === configScale)) {
          console.warn('Configured scale does not exist: ', configScale);
        }
      });
      // Filter scales with the config.
      scales = scales?.filter((scale) => configScales.includes(scale));
    }
    this.scales = scales;
    this.printMaskManager?.setPossibleScales(this.scales);
  }

  /**
   * Updates the available DPIs and current selected dpi value based on the provided client info.
   * @private
   */
  private updateDpis(clientInfo: MFPCapabilitiesLayoutAttributeClientInfo) {
    this.dpis = clientInfo.dpiSuggestions;
    const currentDpi = this.getSelectedDpi() ?? 0;
    if (!this.dpis.includes(currentDpi) || currentDpi > clientInfo.maxDpi) {
      this.state.print.dpi = this.dpis.length ? this.dpis[0] : this.default_dpi;
    }
  }

  /**
   * Updates the available print/panel attributes based on the selected layout and the wanted attribute names.
   * @private
   */
  private updateAvailableAttributes() {
    const layoutAttributes = this.selectedLayout?.attributes ?? [];
    this.attributeNames = this.configAttributeNames.filter((attrName) => {
      if (layoutAttributes.some((layoutAttr) => layoutAttr.name === attrName)) {
        return true;
      }
      console.warn(`Configured attribute "${attrName}" does not exist in layout "${this.selectedLayout?.name}"`);
    });
  }

  /**
   * @returns The ClientInfo config object from the current selected layout.
   * @private
   */
  private getClientInfo(): MFPCapabilitiesLayoutAttributeClientInfo {
    const mapAttribute = this.getCapabilitiesAttribute('map');
    if (!mapAttribute) {
      console.error('No map client info in the current layout');
    }
    return mapAttribute!.clientInfo!;
  }

  /**
   * @returns The capabilities attribute default value or the matching selected value in this print panel.
   * @private
   */
  private getCapabilitiesAttributeValue(attrName: string): string {
    const attribute = this.getCapabilitiesAttribute(attrName);
    if (!attribute) {
      return '';
    }
    const type = this.getAttributeInputType(attrName);
    const input = this.shadow.querySelector(`#${attrName}`) as HTMLInputElement | undefined;
    if (type === 'checkbox') {
      const checked = input?.checked ?? attribute.default ?? false;
      return `${checked}`;
    }
    const value = input?.value ?? attribute.default;
    return value ? `${value}` : '';
  }

  /**
   * @returns An object that contains the custom attributes to print the map.
   */
  private getCustomAttributes(): Record<string, unknown> {
    const customAttributes = this.getAttributesAndValue();
    if (this.getCapabilitiesAttributeValue('legend') === 'true') {
      const legend = this.encodeLegend();
      if (legend) {
        customAttributes['legend'] = legend;
      }
    }
    if (this.getCapabilitiesAttribute('datasource')) {
      customAttributes['datasource'] = this.selectedFeaturesToDatasource();
    }
    return customAttributes;
  }

  /**
   * @returns An object containing the configured wanted attributes to print with their corresponding attribute values.
   * @private
   */
  private getAttributesAndValue(): Record<string, unknown> {
    return this.attributeNames
      .filter((attrName) => attrName !== 'legend')
      .reduce(
        (attributeObj, attrName) => {
          attributeObj[attrName] = this.getCapabilitiesAttributeValue(attrName);
          return attributeObj;
        },
        {} as Record<string, unknown>
      );
  }

  /**
   * @returns The encoded legend or null if empty or if encoding fails.
   */
  private encodeLegend(): MFPLegendClass | null {
    const options: EncodeLegendOptions = {
      ...{
        mapManager: this.mapManager,
        i18nManager: this.i18nManager,
        state: this.state,
        scale: this.getSelectedScale() ?? this.default_scale,
        printResolution: this.mapManager.getMap().getView().getResolution() ?? this.default_resolution,
        pageSize: this.state.print.pageSize ?? [],
        dpi: this.getSelectedDpi() ?? this.default_dpi
      },
      ...this.configManager.Config.print.printLegend
    };
    return this.printManager?.encodeLegend(options) || null;
  }

  /**
   * Set an initial print status element and track the state of the linked print task.
   * @private
   */
  private trackPrintStatus(result: MFPReportResponse) {
    const id = result.ref;
    const date = new Date(Date.now());
    const time = padNumber(date.getHours(), 2) + ':' + padNumber(date.getMinutes(), 2);
    this.printList.push({
      id,
      time,
      selectedFormat: this.getSelectedFormat() ?? this.default_format,
      selectedLayoutName: this.selectedLayout?.name ?? '',
      title: this.getCapabilitiesAttributeValue('title') || id,
      status: PrintStatus.Started
    });
    this.render();

    this.printManager
      ?.getDownloadUrl(this.printUrl ?? '', result, 2000)
      .then((downloadUrl) => this.printFinished(id, downloadUrl))
      .catch((error) => this.printError(id, error));
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

  /**
   * @returns An array of MFPPrintDatasource objects representing the selected features.
   */
  private selectedFeaturesToDatasource(): MFPPrintDatasource[] {
    const center = this.mapManager.getMap().getView().getCenter() ?? [0, 0];
    const scale = this.getSelectedScale() ?? -1;
    const pageSize = this.state.print.pageSize ?? [];
    const extent = this.printManager?.getExtent(pageSize, scale, center) || [0, 0, Infinity, Infinity];
    return (
      this.state.selection.selectedFeatures?.reduce((datasources, feature) => {
        const featureExtent = feature.getGeometry()?.getExtent() ?? [];
        if (!intersects(featureExtent, extent)) {
          return datasources;
        }
        const id = feature.getId();
        const rawTitle = id === undefined ? 'UNKNOWN' : `${id}`.split('.')[0];
        const title = this.i18nManager.getTranslation(rawTitle);
        const properties = deleteFeatureOlParams(feature);
        const datasource = datasources.find((datasource) => datasource.title === title);
        const values = Object.values(properties);
        if (datasource) {
          datasource.table.data.push(values);
          return datasources;
        }
        datasources.push({
          title,
          table: {
            data: [values],
            columns: Object.keys(properties).map((column) => this.i18nManager.getTranslation(column))
          }
        });
        return datasources;
      }, [] as MFPPrintDatasource[]) || []
    );
  }
}

export default PrintComponent;
