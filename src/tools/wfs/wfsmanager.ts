import StateManager from '../state/statemanager';
import SelectionParam from '../../models/selectionparam';
import LayerWms from '../../models/layers/layerwms';
import ServerWfs from '../../models/serverwfs';
import WfsClient, {
  WfsClientDefault,
  WfsClientGeoServer,
  WfsClientMapServer,
  WfsClientOptionalOptions,
  WfsClientQgis
} from './wfsclient';
import WfsFilter from './wfsfilter';
import ServerOgc from '../../models/serverogc';
import VendorSpecificOgcServerManager from '../vendorspecificogcservermanager';
import { isTimeAwareLayer, TimeAwareLayer } from '../../models/layers/timeawarelayer';

export default class WfsManager extends VendorSpecificOgcServerManager<WfsClient, WfsClientOptionalOptions> {
  stateManager: StateManager;
  get state() {
    return this.stateManager.state;
  }

  public getClientId(ogcServer: ServerOgc): string {
    return ogcServer.urlWfs ?? '';
  }

  constructor(type: string) {
    super(type);

    this.stateManager = StateManager.getInstance();
    this.stateManager.subscribe(/layers\.layersList\..*\.filter/, (_oldFilter, newFilter) => {
      void this.onSelectedFeaturesFilterChange(newFilter);
    });
    this.stateManager.subscribe(
      /layers\.layersList\..*\.timeRestriction/,
      (_oldTime: string, _newTime: string, layer: TimeAwareLayer) => {
        if (this.isFirstChildOfTimeAwareGroupOrIndependent(layer)) {
          void this.onSelectedFeaturesFilterChange(layer.filter);
        }
      }
    );

    // Register the default client
    this.registerClientClass('default', WfsClientDefault);
    this.registerClientClass('geoserver', WfsClientGeoServer);
    this.registerClientClass('mapserver', WfsClientMapServer);
    this.registerClientClass('qgisserver', WfsClientQgis);
  }

  async onSelectedFeaturesFilterChange(filter: WfsFilter | undefined) {
    const selectionParamsFilteredLayers: SelectionParam[] = this.state.selection.selectionParameters.map((param) =>
      param.clone((l) => l.wfsQueryable && l.filter === filter)
    );
    const filteredSelectionParams = selectionParamsFilteredLayers.filter((param) => param._layers.length > 0);
    const filteredLayersId = filteredSelectionParams
      .map((p) => p._layers.map((l) => l.queryLayers))
      .flat()
      .join(';');

    if (filteredSelectionParams.length === 0) return;

    this.state.loading = true;
    // WFS GetFeature
    const wfsPromises = filteredSelectionParams.map((param) => {
      const client = this.getClient(param._ogcServer);
      const features = client.getFeature(param);
      return features;
    });
    const filteredSelectedFeatures = (await Promise.all(wfsPromises)).flat();

    // keep only the selected features that are not in the filtered layers
    const selectedFeatures = this.state.selection.selectedFeatures.filter((feature) => {
      const id = feature.getId();
      const featureId = id === undefined ? 'UNKNOWN' : `${id}`.split('.')[0];
      return !filteredLayersId.includes(featureId) && featureId !== 'UNKNOWN';
    });
    // add the newly filtered selected features
    selectedFeatures.push(...filteredSelectedFeatures);
    this.state.selection.selectedFeatures = selectedFeatures;
    this.state.interface.selectionComponentVisible = selectedFeatures.length !== 0;
    this.state.loading = false;
  }

  /**
   * Determines whether the specified layer is the first active child layer of a time-aware group layer,
   * or if it is independent (= with time restriction, but without a time aware parent).
   * This is needed to prevent repeated identical requests when setting the time restriction on
   * multiple child layers at once.
   *
   * @param {TimeAwareLayer} layer - The layer to check.
   */
  private isFirstChildOfTimeAwareGroupOrIndependent(layer: TimeAwareLayer): layer is LayerWms {
    if (layer instanceof LayerWms && layer.active) {
      const parent = layer.parent;
      if (parent && isTimeAwareLayer(parent) && parent.timeRestriction === layer.timeRestriction) {
        // First active child of a time-aware group layer: it will trigger requests for all children in the group
        return parent.children.filter((c) => c.active)[0].id === layer.id;
      } else {
        // Independent wms layer without a time aware parent
        return true;
      }
    }
    return false;
  }

  async getServerWfs(ogcServer: ServerOgc): Promise<ServerWfs>;
  async getServerWfs(layer: LayerWms): Promise<ServerWfs>;
  async getServerWfs(object: ServerOgc | LayerWms): Promise<ServerWfs> {
    const ogcServer = object instanceof LayerWms ? object.ogcServer : object;
    const client = this.getClient(ogcServer);
    return client.getServerWfs();
  }
}
