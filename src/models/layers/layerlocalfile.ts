import Feature from 'ol/Feature';
import Layer from './layer';
import Geometry from 'ol/geom/Geometry';
import ConfigManager from '../../tools/configuration/configmanager';
import { Extent } from 'ol/extent';

class LayerLocalFile extends Layer {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public _features: Feature<Geometry>[];
  public lastModifiedDate: string;
  public isLegendExpanded: boolean;
  public wasLegendExpanded: boolean;
  public extent: Extent;

  constructor(file: File, features: Feature<Geometry>[], extent: Extent) {
    const locale = ConfigManager.getInstance().Config.general.locale;
    const elem = {
      id: 0,
      name: file.name,
      metadata: {
        isLegendExpanded: true,
        wasLegendExpanded: false,
        exclusiveGroup: false,
        isExpanded: false,
        isChecked: true
      }
    };
    super(elem, 0);
    this._features = features;
    this.extent = extent;
    this.lastModifiedDate = new Date(file.lastModified).toLocaleDateString(locale);
    this.isLegendExpanded = true;
    this.wasLegendExpanded = false;
  }
}

export default LayerLocalFile;
