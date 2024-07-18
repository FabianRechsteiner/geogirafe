import GirafeSingleton from '../../base/GirafeSingleton';
import StateManager from '../state/statemanager';
import { SelectionParam } from '../state/state';
import LayerWms from '../../models/layers/layerwms';
import ServerWfs from '../../models/serverwfs';
import AbstractWfsQueryManager from './abstractwfsquerymanager';
import WfsFilter from './wfsfilter';
import WfsMapServerManager from './wfsquerymapservermanager';
import WfsQGISManager from './wfsqueryqgismanager';

export default class WfsManager extends GirafeSingleton {
  stateManager: StateManager;
  get state() {
    return this.stateManager.state;
  }

  private static _queryManagerClasses: Map<string, new (baseUrl: string) => AbstractWfsQueryManager> = new Map();
  private static _queryManagers: Map<string, AbstractWfsQueryManager> = new Map();

  // Register a queryManager with an identifier
  static registerQueryManager(id: string, queryManagerClass: new (baseUrl: string) => AbstractWfsQueryManager) {
    WfsManager._queryManagerClasses.set(id, queryManagerClass);
  }

  // Get a queryManager based on the identifier
  static getQueryManager(id: string, baseUrl: string): AbstractWfsQueryManager | null {
    let queryManager = this._queryManagers.get(baseUrl);
    if (!queryManager) {
      const queryManagerClass = WfsManager._queryManagerClasses.get(id);
      if (!queryManagerClass) {
        console.error(`queryManagerClass not found for baseUrl: ${baseUrl}, id: ${id}`);
        return null;
      }
      queryManager = new queryManagerClass(baseUrl);
      this._queryManagers.set(baseUrl, queryManager);
    }
    return queryManager;
  }

  constructor(type: string) {
    super(type);

    this.stateManager = StateManager.getInstance();
    this.stateManager.subscribe(
      'selection.selectionParameters',
      (_oldParams: SelectionParam[], newParams: SelectionParam[]) => this.onSelectFeatures(newParams)
    );
    this.stateManager.subscribe(/layers\.layersList\..*\.filter/, (_oldFilter, newFilter) => {
      this.onSelectedFeaturesFilterChange(newFilter);
    });

    // Register the default queryManager
    WfsManager.registerQueryManager('default', WfsMapServerManager);
    WfsManager.registerQueryManager('mapserver', WfsMapServerManager);
    WfsManager.registerQueryManager('qgisserver', WfsQGISManager);
  }

  static getQueryManagerByLayer(layer: LayerWms): AbstractWfsQueryManager {
    // Get the queryManager based on the servertype of the first layer
    let queryManager = WfsManager.getQueryManager(layer.ogcServer.type, layer.urlWfs ?? '');

    if (!queryManager) {
      queryManager = WfsManager.getQueryManager('default', layer.urlWfs ?? '');
    }

    return queryManager as AbstractWfsQueryManager;
  }

  async querySelection(selectionParams: SelectionParam[]) {
    const selectedFeaturesPerParam = await Promise.all(
      selectionParams.map((param) => {
        const queryManager = WfsManager.getQueryManagerByLayer(param._layers[0]);

        if (!queryManager) {
          console.error('No queryManager found for this server type');
          return [];
        }
        const features = queryManager.wfsQuery(param);
        return features;
      })
    );
    return selectedFeaturesPerParam;
  }

  async onSelectFeatures(selectionParams: SelectionParam[]) {
    this.state.loading = true;

    const selectedFeaturesPerParam = await this.querySelection(selectionParams);
    const selectedFeatures = selectedFeaturesPerParam.flat();

    if (selectedFeatures.length === 0) {
      // No feature selectedFeaturesPerParamselected
      this.state.interface.selectionComponentVisible = false;
    } else {
      console.debug('WfsMamager.onSelectFeatures(): selectedFeatures', selectedFeatures);
      this.state.selection.selectedFeatures.push(...selectedFeatures);
      this.state.interface.selectionComponentVisible = true;
    }

    this.state.loading = false;
  }

  async onSelectedFeaturesFilterChange(filter: WfsFilter) {
    this.state.loading = true;

    const selectionParamsFilteredlayers = this.state.selection.selectionParameters.map((param) => {
      const filteredLayersInParam = param._layers.filter((layer: LayerWms) => layer.filter === filter);
      return {
        _layers: filteredLayersInParam,
        selectionBox: param.selectionBox,
        srid: param.srid
      };
    });
    const filteredSelectionParams = selectionParamsFilteredlayers.filter((param) => param._layers.length > 0);
    const filteredLayersId = filteredSelectionParams
      .map((p) => p._layers.map((l) => l.queryLayers))
      .flat()
      .join(';');
    const filteredSelectedFeaturesPerParam = await this.querySelection(filteredSelectionParams);
    const filteredSelectedFeatures = filteredSelectedFeaturesPerParam.flat();

    // keep only the selected features that are not in the filtered layers
    const selectedFeatures = this.state.selection.selectedFeatures.filter((feature) => {
      const id = feature.getId();
      const featureId = id === undefined ? 'UNKNOWN' : `${id}`.split('.')[0];
      return !filteredLayersId.includes(featureId);
    });
    // add the newly filtered selected features
    selectedFeatures.push(...filteredSelectedFeatures);

    if (selectedFeatures.length === 0) {
      // No feature selected
      this.state.interface.selectionComponentVisible = false;
    } else {
      this.state.selection.selectedFeatures = selectedFeatures;
      this.state.interface.selectionComponentVisible = true;
    }
    this.state.loading = false;
  }

  static async getServerWfs(layer: LayerWms): Promise<ServerWfs> {
    const queryManager = WfsManager.getQueryManagerByLayer(layer);

    return queryManager.getServerWfs();
  }

  static wmsGetMapFilter(layerWms: LayerWms) {
    return WfsManager.getQueryManagerByLayer(layerWms).wmsGetMapFilter(layerWms);
  }
}
