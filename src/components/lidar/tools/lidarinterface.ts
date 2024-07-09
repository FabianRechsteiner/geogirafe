import lidarProfileManager, { LidarProfileManager } from './manager';
import KML from 'ol/format/KML';
import Feature from 'ol/Feature';
import { saveAs } from 'file-saver';
import StateManager from '../../../tools/state/statemanager';

import type OlGeomLineString from 'ol/geom/LineString';
import type LidarProfileConfig from './profileconfig';
import type CsvManager from '../../../tools/export/csvmanager';
import type { LidarProfileServerConfigClassification, LidarProfileServerConfigPointAttribute } from './profileconfig';

/**
 * Interface/helper class between the UI panel and the Lidar manager.
 */
export class LidarInterface {
  private readonly profileConfig: LidarProfileConfig | null = null;
  private readonly profileManager: LidarProfileManager;
  private readonly csvManager: CsvManager;
  private line: OlGeomLineString | null = null;
  constructor(profileConfig: LidarProfileConfig, csvManager: CsvManager) {
    this.profileConfig = profileConfig;
    this.csvManager = csvManager;
    this.profileManager = lidarProfileManager;
  }

  /**
   * Set the line to let this class know if a line has been drawn or not.
   */
  setLine(line: OlGeomLineString | null) {
    this.line = line;
  }

  /**
   * Clear the LIDAR profile tool.
   */
  clearProfile(): void {
    this.profileManager.setLine(null);
    this.profileManager.cartoHighlight.setPosition(undefined);
    if (this.profileManager.measure) {
      this.clearMeasure();
    }
    this.resetPlot();
  }

  /**
   * Activate the measure tool
   */
  setMeasureActive(): void {
    if (!this.profileManager.measure) {
      console.error('Missing profile.measure');
      return;
    }
    this.profileManager.measure.clearMeasure();
    this.profileManager.measure.setMeasureActive();
  }

  /**
   * Clear the current measure
   */
  clearMeasure(): void {
    if (!this.profileManager.measure) {
      console.error('Missing profile.measure');
      return;
    }
    this.profileManager.measure.clearMeasure();
  }

  /**
   * Reload and reset the plot for the current profile (reloads data)
   */
  resetPlot(): void {
    this.profileManager.clearBuffer();
    if (this.line) {
      this.profileManager.getProfileByLOD([], 0, true, 0);
    }
  }

  /**
   * Sets the visible classification in the profile
   * @param classification selected value.
   * @param key of the classification code.
   */
  setClassification(classification: LidarProfileServerConfigClassification, key: number): void {
    if (!this.profileManager.plot) {
      console.error('Missing profile.plot');
      return;
    }
    if (!this?.profileConfig?.serverConfig) {
      console.error('Missing profileConfig.serverConfig');
      return;
    }
    const classificationColors = this.profileConfig.serverConfig.classification_colors ?? [];
    classificationColors[key].visible = classification.visible;
    if (this.line) {
      this.profileManager.plot.setClassActive(
        classificationColors,
        this.profileConfig.serverConfig.default_attribute ?? ''
      );
    }
  }

  /**
   * Set visible the selected point attribute option
   */
  selectPointAttribute(pointAttributeName: string): void {
    const availablePointAttributes = this.profileConfig?.clientConfig?.pointAttributes?.availableOptions ?? [];
    const pointAttribute = availablePointAttributes.find(
      (pointAttribute) => pointAttribute.name === pointAttributeName
    );
    if (pointAttribute) {
      this.setSelectedPointAttribute(pointAttribute);
    }
  }

  /**
   * Update the current drawn profile.
   * The line to compute the profile must be set before to call this method.
   */
  updateProfile() {
    this.profileManager.clearBuffer();
    if (!this.profileConfig?.serverConfig) {
      console.error('Missing profileConfig.serverConfig');
      return;
    }
    this.profileManager.setLine(this.line);
    this.profileManager.getProfileByLOD([], 0, true, this.profileConfig.serverConfig.minLOD ?? 0);
  }

  /**
   * Export the profile to a file (csv or png).
   */
  exportFile(fileType: string) {
    switch (fileType) {
      case 'csv':
        return this.csvExport();
      case 'png':
        return this.pngExport();
      case 'kml':
        return this.kmlExport();
    }
  }

  private csvExport() {
    const points = this.profileManager.utils.getFlatPointsByDistance(this.profileManager.profilePoints) || [];
    const csvData = this.profileManager.utils.getCSVData(points);
    const headerColumnNames = Object.keys(points[0]);
    const headerColumns = headerColumnNames.map((columnName) => {
      return { name: columnName };
    });
    this.csvManager.startDownload(csvData, headerColumns, 'LIDAR_profile.csv');
  }

  private pngExport() {
    const clientConfig = this.profileConfig?.clientConfig;
    if (!clientConfig) {
      return;
    }
    this.profileManager.utils.downloadProfileAsImageFile(clientConfig);
  }

  private kmlExport() {
    if (this.line) {
      const kml = new KML().writeFeatures([new Feature({ geometry: this.line })], {
        dataProjection: 'EPSG:4326',
        featureProjection: StateManager.getInstance().state.projection
      });
      saveAs(new Blob([kml], { type: 'text/plain;charset=utf-8' }), 'profile.kml');
    } else {
      console.warn('A line should be drawn before being exporting to KML');
    }
  }

  /**
   * Set the selected point attribute
   * @param selectedPointAttribute The new selected point attribute.
   */
  private setSelectedPointAttribute(selectedPointAttribute: LidarProfileServerConfigPointAttribute): void {
    if (!this.profileConfig?.clientConfig.pointAttributes) {
      console.error('Missing pointAttributes');
      return;
    }
    if (!this.profileManager.plot) {
      console.error('Missing plot');
      return;
    }
    this.profileConfig.clientConfig.pointAttributes.selectedOption = selectedPointAttribute;
    this.profileManager.plot.changeStyle(selectedPointAttribute.value ?? '');
  }
}
