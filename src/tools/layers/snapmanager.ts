import GirafeSingleton from '../../base/GirafeSingleton';
import { isSnappableLayer, SnappableLayer } from '../../models/layers/snappablelayer';
import SelectionParam from '../../models/selectionparam';
import Snap from 'ol/interaction/Snap';
import { Collection, Feature, Map as OlMap } from 'ol';
import Layer from '../../models/layers/layer';
import { Interaction } from 'ol/interaction';

type SnapOptions = {
  snapInteraction: Snap;
  snapFeatures: Collection<Feature>;
};

class SnapManager extends GirafeSingleton {
  private readonly snapLayers = new Map<SnappableLayer, SnapOptions>();

  private get olMap(): OlMap {
    return this.context.mapManager.getMap();
  }

  public override initializeSingleton() {
    this.context.stateManager.subscribe(
      /layers\.layersList\..*\.activeState/,
      (_oldActive: string, _newActive: string, layer: Layer) => {
        this.layerUpdated(layer);
      }
    );
    this.context.stateManager.subscribe(
      /layers\.layersList\..*\.snapActive/,
      (_oldSnap: boolean, _newSnap: boolean, layer: SnappableLayer) => {
        this.layerUpdated(layer);
      }
    );

    this.olMap
      .getInteractions()
      .on('add', (event: { element: Interaction }) => this.mapInteractionsChanged(event.element));
  }

  private mapInteractionsChanged(interaction: Interaction) {
    if (!(interaction instanceof Snap)) {
      this.snapLayers.forEach((options) => {
        // Snapping interactions have to be removed and readded, because they mut be the last ones in the list of interactions
        // This is a limitation of OpenLayers. Otherwise the drawing interaction will prevail to the snapping one
        // And snapping won't work when the drawing tool is changed.
        this.olMap.removeInteraction(options.snapInteraction);
        this.olMap.addInteraction(options.snapInteraction);
      });
    }
  }

  private layerUpdated(layer: Layer) {
    if (!isSnappableLayer(layer)) {
      // Nothing to do
      return;
    }

    if (layer.active && layer.snapActive) {
      const snapOptions = this.createSnapOptions(layer);
      this.registerLayer(layer, snapOptions);
    } else {
      this.unregisterLayer(layer);
    }
  }

  private createSnapOptions(layer: SnappableLayer): SnapOptions {
    const snapFeatures = new Collection<Feature>();
    const options = layer.snapOptions || {};

    const interaction = new Snap({
      edge: options.edge,
      features: snapFeatures,
      pixelTolerance: options.tolerance,
      vertex: options.vertex
    });

    const snapOptions = {
      active: layer.snapActive,
      snapInteraction: interaction,
      snapFeatures: snapFeatures
    };

    return snapOptions;
  }

  private registerLayer(layer: SnappableLayer, snapOptions: SnapOptions) {
    this.snapLayers.set(layer, snapOptions);
    this.loadFeaturesForLayer(layer, snapOptions);
    snapOptions.snapInteraction.setActive(true);
    this.olMap.addInteraction(snapOptions.snapInteraction);
    this.olMap.getView().un('change', this.reloadFeatures.bind(this));
    this.olMap.getView().on('change', this.reloadFeatures.bind(this));
  }

  private unregisterLayer(layer: SnappableLayer) {
    const snapOptions = this.snapLayers.get(layer);
    if (snapOptions) {
      snapOptions.snapInteraction.setActive(false);
      snapOptions.snapFeatures.clear();
      this.olMap.removeInteraction(snapOptions.snapInteraction);
      this.snapLayers.delete(layer);
    }
  }

  private reloadFeatures() {
    for (const [layer, options] of this.snapLayers) {
      this.loadFeaturesForLayer(layer, options);
    }
  }

  private async loadFeaturesForLayer(layer: SnappableLayer, options: SnapOptions) {
    const client = this.context.wfsManager.getClient(layer.ogcServer);
    const extent = this.olMap.getView().getViewStateAndExtent().extent;
    const selectionParam = new SelectionParam(
      layer.ogcServer,
      [layer],
      this.context.stateManager.state.projection,
      extent
    );
    const features = await client.getFeature(selectionParam);
    options.snapFeatures.extend(features);
  }
}

export default SnapManager;
