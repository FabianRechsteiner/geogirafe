import Feature from 'ol/Feature';
import Layer from './layer';
import Geometry from 'ol/geom/Geometry';
import ConfigManager from '../../tools/configuration/configmanager';
import { Extent } from 'ol/extent';
import ILayerWithLegend from './ilayerwithlegend';

class LayerLocalFile extends Layer implements ILayerWithLegend {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public _features: Feature<Geometry>[];
  public lastModifiedDate: string;
  public legend: boolean = true;
  public isLegendExpanded: boolean;
  public wasLegendExpanded: boolean;
  public extent: Extent;

  constructor(file: File, features: Feature<Geometry>[], extent: Extent) {
    super(0, file.name, 0, { isDefaultChecked: true });
    this._features = features;
    this.extent = extent;
    this.lastModifiedDate = new Date(file.lastModified).toLocaleDateString(
      ConfigManager.getInstance().Config.general.locale
    );
    this.isLegendExpanded = true;
    this.wasLegendExpanded = false;
  }

  clone(): LayerLocalFile {
    throw new Error('Cannot clone layer for local file.');
  }
}

export default LayerLocalFile;
