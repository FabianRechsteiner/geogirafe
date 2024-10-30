import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import LidarProfileConfig from '../tools/profileconfig';
import DrawLine from '../tools/drawline';
import MapManager from '../../../tools/state/mapManager';
import CsvManager from '../../../tools/export/csvmanager';
import lidarProfileManager from '../tools/manager';
import { LidarInterface } from '../tools/lidarinterface';

import type { LidarProfileManager } from '../tools/manager';
import type { Callback } from '../../../tools/state/statemanager';
import type {
  LidarProfileServerConfigClassification,
  LidarProfileServerConfigClassifications,
  LidarProfileServerConfigPointAttribute
} from '../tools/profileconfig';

import eraserSvgUrl from '../images/eraser.svg';
import rotateSvgUrl from '../images/rotate.svg';

/**
 * Class representing the Lidar Panel Component.
 * Fetch and inits the Lidar config.
 * Activate and deactivate Lidar tool.
 * Manage draw line for lidar.
 */
export default class LidarPanelComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  eraserSvgUrl = eraserSvgUrl;
  rotateSvgUrl = rotateSvgUrl;

  private csvManager: CsvManager;
  private profileConfig: LidarProfileConfig | null = null;
  private profileManager: LidarProfileManager;
  private visible = false;
  private drawLine: DrawLine;
  private lidarInterface?: LidarInterface;
  private mapManager: MapManager;
  private readonly eventsCallbacks: Callback[] = [];
  private isVisibleComponentSetup = false;

  constructor() {
    super('lidar-panel');
    this.csvManager = CsvManager.getInstance();
    this.mapManager = MapManager.getInstance();
    this.profileManager = lidarProfileManager;
    this.drawLine = new DrawLine(this.state);
  }

  connectedCallback() {
    this.render();
    this.registerVisibilityEvents();
  }

  /**
   * Render the component regarding its visibility.
   * At first rendering, fetch and init the lidar config, init side-kick classes
   * and register to events.
   */
  render() {
    this.visible ? this.renderComponent() : this.renderEmptyComponent();
  }

  /**
   * @returns true if the configuration is loaded.
   */
  isConfigLoaded(): boolean {
    return !!this.profileConfig?.serverConfig;
  }

  /**
   * @returns true if a lidar-line is drawn.
   */
  isLineDrawn(): boolean {
    return !!this.state.lidar.line;
  }

  /**
   * @returns true if the draw line tool is activated.
   */
  isDrawActive(): boolean {
    return this.state.lidar.drawActive;
  }

  /**
   * @returns The available point attributes from the LidarProfileServerConfig instance.
   */
  getAvailablePointAttributes(): LidarProfileServerConfigPointAttribute[] {
    return this.profileConfig?.clientConfig?.pointAttributes?.availableOptions || [];
  }

  /**
   * @returns The classifications of the LidarProfileServerConfig.
   */
  getClassifications(): LidarProfileServerConfigClassifications {
    return this.profileConfig?.serverConfig?.classification_colors || [];
  }

  /**
   * @returns true if the given pointAttributeName is the currently selected one in the config.
   */
  isPointAttributeSelected(pointAttributeName: string | undefined): boolean {
    const selectedPointAttribute = this.profileConfig?.clientConfig.pointAttributes?.selectedOption;
    return pointAttributeName === selectedPointAttribute?.name;
  }

  /**
   * Toggles the drawline active state.
   * The drawline is rendered after the state has been toggled.
   */
  toggleDrawLine(): void {
    this.drawLine.setActive(!this.isDrawActive());
    this.render();
  }

  /**
   * Exports a file of the specified type.
   */
  exportFile(type: string): void {
    if (!this.isLineDrawn()) {
      return;
    }
    this.lidarInterface?.exportFile(type);
  }

  /**
   * Toggle visibility of the selected classification object.
   * @param classification The classification to change visibility.
   * @param key The key string of the toggled classification.
   */
  toggleClassificationVisibility(classification: LidarProfileServerConfigClassification, key: string): void {
    classification.visible = classification.visible === 0 ? 1 : 0;
    this.lidarInterface?.setClassification(classification, parseInt(key));
  }

  /**
   * Activate the measure on the Lidar chart.
   */
  setMeasureActive() {
    this.lidarInterface?.setMeasureActive();
  }

  /**
   * Clear the measure on the Lidar chart.
   */
  clearMeasure() {
    this.lidarInterface?.clearMeasure();
  }

  /**
   * Reset the chart to its default size.
   */
  resetPlot() {
    this.lidarInterface?.resetPlot();
  }

  /**
   * Set the selected point attribute to use to draw the Lidar.
   */
  selectPointAttribute(evt: Event) {
    const eventValue = (evt.target as HTMLInputElement)?.value;
    this.lidarInterface?.selectPointAttribute(eventValue);
  }

  /**
   * Renders the component by calling the necessary methods.
   * @private
   */
  private renderComponent() {
    super.render();
    this.renderComponentConfigPart();
    this.activateTooltips(false, [800, 0], 'top-end');
    super.girafeTranslate();
  }

  /**
   * Renders the component config part, like every element linked to the lidar config.
   * Loads the config and the side-kick classes if not already loaded.
   * @private
   */
  private async renderComponentConfigPart() {
    if (!this.isConfigLoaded()) {
      if (!(await this.initComponentConfig())) {
        return;
      }
      // Render again, with config and related elements well set.
      this.render();
      return;
    }
    if (!this.isVisibleComponentSetup) {
      this.setupVisibleComponent();
      this.render();
    }
  }

  /**
   * Set listener and activate draw line on opening the panel.
   * @private
   */
  private setupVisibleComponent() {
    this.state.selection.enabled = false;
    this.registerEvents();
    this.drawLine.setMap(this.mapManager.getMap());
    this.drawLine.setActive(true);
    this.isVisibleComponentSetup = true;
  }

  /**
   * Hide the panel, and removes listeners and interactions.
   * @private
   */
  private renderEmptyComponent() {
    this.state.selection.enabled = true;
    this.isVisibleComponentSetup = false;
    this.drawLine.setActive(false);
    this.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;
    this.lidarInterface?.clearProfile();
    this.renderEmpty();
  }

  /**
   * Load the application config and then fetch the config and initialize side-kick classes.
   * @returns true if the config is well fetched and loaded.
   * @private
   */
  private async initComponentConfig(): Promise<boolean | undefined> {
    const lidarUrl = this.configManager.Config.lidar.url;
    this.profileConfig = new LidarProfileConfig(lidarUrl);
    await this.loadConfig();
    await this.profileConfig.initProfileConfig();
    this.profileManager.init(this.profileConfig, this.mapManager.getMap());
    this.lidarInterface = new LidarInterface(this.profileConfig, this.csvManager);
    return this.isConfigLoaded();
  }

  private registerVisibilityEvents() {
    this.subscribe('interface.lidarPanelVisible', (_oldValue, newValue) => this.togglePanel(newValue));
  }

  private async togglePanel(visible: boolean): Promise<void> {
    this.visible = visible;
    this.render();
  }

  /**
   * Listen lidar line and lidar draw active state to update the rendering with.
   * @private
   */
  private registerEvents() {
    this.eventsCallbacks.push(
      this.subscribe('lidar.line', (oldVal, newVal) => {
        if (oldVal === newVal) {
          return;
        }
        this.lidarInterface?.setLine(newVal);
        this.drawLine.setLine(newVal);
        newVal ? this.lidarInterface?.updateProfile() : this.lidarInterface?.clearProfile();
        this.render();
      })
    );
    this.eventsCallbacks.push(
      this.subscribe('lidar.drawActive', (oldVal, newVal) => {
        if (oldVal === null || oldVal === newVal) {
          return;
        }
        this.render();
      })
    );
  }
}
