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
      this.onSelectedFeaturesFilterChange(newFilter);
    });

    // Register the default client
    this.registerClientClass('default', WfsClientDefault);
    this.registerClientClass('geoserver', WfsClientGeoServer);
    this.registerClientClass('mapserver', WfsClientMapServer);
    this.registerClientClass('qgisserver', WfsClientQgis);
  }

  async onSelectedFeaturesFilterChange(filter: WfsFilter) {
    this.state.loading = true;

    const selectionParamsFilteredlayers: SelectionParam[] = this.state.selection.selectionParameters.map((param) =>
      param.clone((l) => l.wfsQueryable && l.filter === filter)
    );
    const filteredSelectionParams = selectionParamsFilteredlayers.filter((param) => param._layers.length > 0);
    const filteredLayersId = filteredSelectionParams
      .map((p) => p._layers.map((l) => l.queryLayers))
      .flat()
      .join(';');

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
      return !filteredLayersId.includes(featureId);
    });
    // add the newly filtered selected features
    selectedFeatures.push(...filteredSelectedFeatures);
    this.state.selection.selectedFeatures = selectedFeatures;
    this.state.interface.selectionComponentVisible = selectedFeatures.length !== 0;
    this.state.loading = false;
  }

  async getServerWfs(ogcServer: ServerOgc): Promise<ServerWfs>;
  async getServerWfs(layer: LayerWms): Promise<ServerWfs>;
  async getServerWfs(object: ServerOgc | LayerWms): Promise<ServerWfs> {
    const ogcServer = object instanceof LayerWms ? object.ogcServer : object;
    const client = this.getClient(ogcServer);
    return client.getServerWfs();
  }
}
