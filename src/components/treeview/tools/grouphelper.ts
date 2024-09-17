import LayerManager from '../../../tools/layermanager';
import GroupLayer from '../../../models/layers/grouplayer';
import BaseLayer from '../../../models/layers/baselayer';
import ThemeLayer from '../../../models/layers/themelayer';
import ConfigManager from '../../../tools/configuration/configmanager';
import Layer from '../../../models/layers/layer';
import ILayerWithLegend from '../../../models/layers/ilayerwithlegend';

export default class GroupHelper {
  private static layerManager: LayerManager = LayerManager.getInstance();
  private static configManager: ConfigManager = ConfigManager.getInstance();

  public static getSortedLayers(layers: BaseLayer[]) {
    const orderedLayers = layers.slice().sort((l1: BaseLayer, l2: BaseLayer) => {
      return l1.order - l2.order;
    });
    return orderedLayers ?? [];
  }

  public static activateDefaultLayers(layers: BaseLayer[]) {
    for (const layer of layers) {
      // Activate the layer by default
      this.layerManager.activateIfDefaultChecked(layer);

      // Manage the legend visibility
      if (
        layer instanceof Layer &&
        !layer.active &&
        this.configManager.Config.treeview.hideLegendWhenLayerIsDeactivated &&
        this.layerManager.isLayerWithLegend(layer)
      ) {
        // Hide Legend
        (layer as ILayerWithLegend).isLegendExpanded = false;
        (layer as ILayerWithLegend).wasLegendExpanded = true;
      }

      // Continue recursively
      if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
        this.activateDefaultLayers(layer.children);
      }
    }
  }
}
