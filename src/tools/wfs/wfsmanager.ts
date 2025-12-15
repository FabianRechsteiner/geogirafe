import SelectionParam from '../../models/selectionparam';
import LayerWms from '../../models/layers/layerwms';
import ServerWfs from '../../models/serverwfs';
import WfsClient, {
  WfsClientDefault,
  WfsClientGeoServer,
  WfsClientMapServer,
  WfsClientOptionalOptions,
  WfsClientQgis,
  WfsClientGeorama
} from './wfsclient';
import WfsFilter from './wfsfilter';
import ServerOgc from '../../models/serverogc';
import VendorSpecificOgcServerManager from '../vendorspecificogcservermanager';
import { isTimeAwareLayer, TimeAwareLayer } from '../../models/layers/timeawarelayer';
import Feature from 'ol/Feature';

export default class WfsManager extends VendorSpecificOgcServerManager<WfsClient, WfsClientOptionalOptions> {
  private get state() {
    return this.context.stateManager.state;
  }

  public getClientId(ogcServer: ServerOgc): string {
    return ogcServer.urlWfs ?? '';
  }

  public static readonly UnknownFeatureType: string = 'UNKNOWN';

  public override initializeSingleton() {
    this.context.stateManager.subscribe(/layers\.layersList\..*\.filter/, (_oldFilter, newFilter) => {
      void this.onSelectedFeaturesFilterChange(newFilter);
    });
    this.context.stateManager.subscribe(
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
    this.registerClientClass('georama.webgis', WfsClientGeorama);
  }

  private async onSelectedFeaturesFilterChange(filter: WfsFilter | undefined) {
    const selectionParamsFilteredLayers: SelectionParam[] = this.state.selection.selectionParameters.map((param) =>
      param.clone((l) => l.wfsQueryable && l.filter === filter)
    );
    const filteredSelectionParams = selectionParamsFilteredLayers.filter((param) => param.layers.length > 0);
    const filteredLayersId = filteredSelectionParams
      .map((p) => p.layers.map((l) => l.queryLayers))
      .flat()
      .join(';');

    if (filteredSelectionParams.length === 0) return;

    this.state.loading = true;
    // WFS GetFeature
    const wfsPromises = filteredSelectionParams.map((param) => {
      const client = this.getClient(param.ogcServer);
      const features = client.getFeature(param);
      return features;
    });
    const filteredSelectedFeatures = (await Promise.all(wfsPromises)).flat();

    // keep only the selected features that are not in the filtered layers
    const selectedFeatures = this.state.selection.selectedFeatures.filter((feature) => {
      const featureType = WfsManager.extractFeatureTypeFromId(feature);
      return !filteredLayersId.includes(featureType) && featureType === WfsManager.UnknownFeatureType;
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

  public async getServerWfs(ogcServer: ServerOgc): Promise<ServerWfs>;
  public async getServerWfs(layer: LayerWms): Promise<ServerWfs>;
  public async getServerWfs(object: ServerOgc | LayerWms): Promise<ServerWfs> {
    const ogcServer = object instanceof LayerWms ? object.ogcServer : object;
    const client = this.getClient(ogcServer);
    return client.getServerWfs();
  }

  /**
   * Extracts the feature type from the feature's ID. A feature ID may contain a prefix,
   * the feature type and a feature-specific ID. It returns "UNKNOWN" if the ID is absent.
   */
  public static extractFeatureTypeFromId(feature: Feature): string {
    let id = feature.getId();
    if (!id) {
      return WfsManager.UnknownFeatureType;
    }
    id = `${id}`;
    // First, remove the feature prefix if present, e.g. "my_prefix:my_feature_type.123"
    const idWithPrefix = id.split(':');
    if (idWithPrefix.length > 1) {
      idWithPrefix.shift();
      id = idWithPrefix.join(':');
    }
    const splitId = id.split('.');
    if (splitId.length <= 1) {
      return id;
    }
    // Remove the feature ID from the type
    splitId.pop();
    return splitId.join('.');
  }
}
