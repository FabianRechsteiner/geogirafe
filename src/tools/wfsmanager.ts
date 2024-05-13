import { WFS } from 'ol/format';
import GML3 from 'ol/format/GML3';

import GirafeSingleton from '../base/GirafeSingleton';
import MessageManager from './messagemanager';
import StateManager from './state/statemanager';
import { SelectionParam } from './state/state';
import LayerWms from '../models/layers/layerwms';
import ServerWfs from '../models/serverwfs';

export default class WfsManager extends GirafeSingleton {
  messageManager: MessageManager;
  stateManager: StateManager;
  get state() {
    return this.stateManager.state;
  }

  //TODO: make this configurable
  maxFeatures: number = 10000;

  serversWfs: Record<string, ServerWfs> = {};
  featureTypeToGeometryColumnName: { [key: string]: string } = {};

  constructor(type: string) {
    super(type);

    this.stateManager = StateManager.getInstance();
    this.messageManager = MessageManager.getInstance();

    this.stateManager.subscribe(
      'selection.selectionParameters',
      (_oldParams: SelectionParam[], newParams: SelectionParam[]) => this.onSelectFeatures(newParams)
    );
  }

  onSelectFeatures(selectionParams: SelectionParam[]) {
    this.state.loading = true;
    this.wfsQuery(selectionParams).then(() => (this.state.loading = false));
  }

  async getServerWfs(wfsUrl: string) {
    if (!(wfsUrl in this.serversWfs)) {
      await this.initializeWfs([wfsUrl]);
    }
    return this.serversWfs[wfsUrl];
  }

  private async initializeWfs(wfsUrlsToInit: string[]) {
    for (const wfsUrl of wfsUrlsToInit) {
      if (wfsUrl in this.serversWfs) {
        continue;
      }

      const serverWfs = new ServerWfs('', wfsUrl);
      const response = await fetch(this.getDescribeFeatureTypeUrl(wfsUrl));
      const content = await response.text();
      const xml = new DOMParser().parseFromString(content, 'text/xml');

      // First find all direct "element" childs
      const elementTypeToName = this.getElementToTypeName(xml);

      // Then, find all "complexType" elements
      for (const tag of xml.getElementsByTagName('complexType')) {
        this.initializeAttribute(tag, serverWfs, elementTypeToName);
      }

      // This WFS is now initialized
      serverWfs.initialized = true;
      this.serversWfs[wfsUrl] = serverWfs;
    }
  }

  private initializeAttribute(tag: Element, serverWfs: ServerWfs, elementTypeToName: Record<string, string>) {
    const typeName = tag.getAttribute('name');
    if (!typeName) {
      throw new Error('Could not find a name for the complex type');
    }

    const featureType = elementTypeToName[typeName];
    const elements = Array.from(tag.getElementsByTagName('sequence')[0].getElementsByTagName('element'));

    let geometryAttributeFound: boolean = false;
    for (const element of elements) {
      if (this.manageLayerAttribute(serverWfs, element, featureType)) {
        geometryAttributeFound = true;
      }
    }

    // If we didn't find any geometry attribute for this featureType, then we have a problem
    // Because the wfs query won't be possible
    if (!geometryAttributeFound) {
      throw new Error('No Geometry column for the type ' + featureType);
    }
  }

  manageLayerAttribute(serverWfs: ServerWfs, element: Element, featureType: string) {
    let geometryAttributeFound: boolean = false;
    const type = element.getAttribute('type');

    if (type && type.startsWith('gml:')) {
      // We are on the geometry attribute
      const geometryAttributeName = element.getAttribute('name');
      if (geometryAttributeName) {
        this.featureTypeToGeometryColumnName[featureType] = geometryAttributeName;
        geometryAttributeFound = true;
      } else {
        throw new Error('Why is geometryAttributeName null here ?');
      }
    } else {
      // We are not on an geometry attribute, but on a normal attribute
      // We update the WMS Layer with its attributes informations
      const attrName = element.getAttribute('name');
      const attrType = element.getAttribute('type');
      if (!attrName || !attrType) {
        console.warn(
          `Error while loading attribute for layer ${featureType}. Querying or filtering this layer won't work correctly.`
        );
      } else {
        serverWfs.addLayerAttribute(featureType, attrName, attrType);
      }
    }

    return geometryAttributeFound;
  }

  getElementToTypeName(xml: Document) {
    const elementTypeToName: Record<string, string> = {};
    const elements = xml.querySelectorAll(':scope>element');
    for (const element of elements) {
      if (element.hasAttribute('name') && element.hasAttribute('type')) {
        const name = element.getAttribute('name');
        let type = element.getAttribute('type');
        if (type && name) {
          if (type.includes(':')) {
            type = type.split(':')[1];
          }
          elementTypeToName[type] = name;
        }
      } else {
        console.log('What happend with this element?');
      }
    }
    return elementTypeToName;
  }

  getDescribeFeatureTypeUrl(wfsUrl: string) {
    const url = new URL(wfsUrl);
    url.searchParams.set('service', 'WFS');
    url.searchParams.set('request', 'DescribeFeatureType');
    // TODO REG: Manage different WFS versions
    url.searchParams.set('version', '1.1.0');
    return url.href;
  }

  async wfsQuery(selectionParams: SelectionParam[]) {
    // Add all WFS layers to this.serverWfs
    for (const param of selectionParams) {
      await this.initializeWfs(this.getQueryableLayers(param).map((l) => l.urlWfs!));
    }

    const promises = [];
    for (const selectionParam of selectionParams) {
      // First, keep only queryable layers and verify that all layers have the same WFS URL
      const queryableLayers = this.getQueryableLayers(selectionParam);
      if (queryableLayers.length <= 0) {
        continue;
      }

      // Get the geometry column name of each layer
      // TODO REG : (not sure) This could probably be simplify by initializing a property in the ServerWfs object
      // containing the name of the geometry column during the WFS initialization.
      const geometryColumnNameToFeatureType = this.getGeometryColumnNameToFeatureTypes(queryableLayers);

      for (const [columnName, featureTypes] of Object.entries(geometryColumnNameToFeatureType)) {
        // WFS GetFeature
        const featureRequest = new WFS().writeGetFeature({
          srsName: selectionParam.srid,
          // TODO: this should be configurable
          featureNS: 'https://mapserver.gis.umn.edu/mapserver',
          featurePrefix: 'feature',
          featureTypes: featureTypes,
          maxFeatures: this.maxFeatures,
          // TODO REG: Do we always want to use the format GML3 here ?
          outputFormat: 'GML3',
          geometryName: columnName,
          bbox: selectionParam.selectionBox
          //resultType: 'hits'
          /*filter: andFilter(
            likeFilter('name', 'Mississippi*'),
            equalToFilter('waterway', 'riverbank')
          ),*/
        });

        promises.push(
          fetch(queryableLayers[0].urlWfs!, {
            method: 'POST',
            body: new XMLSerializer().serializeToString(featureRequest)
          })
        );
      }
    }

    // Wait the result of all promises to display responses
    return Promise.all(promises).then(async (responses) => {
      const selectedFeatures = [];
      for (const element of responses) {
        const gml = await element.text();
        // TODO REG: Do we always want to use the format GML3 here ?
        const features = new GML3().readFeatures(gml);
        selectedFeatures.push(...features);
      }
      if (selectedFeatures.length === 0 && this.state.selection.selectedFeatures.length == 0) {
        // No feature selected
        this.state.interface.selectionGridVisible = false;
      } else {
        this.state.selection.selectedFeatures.push(...selectedFeatures);
        this.state.interface.selectionGridVisible = true;
      }
    });
  }

  getQueryableLayers(selectionParam: SelectionParam) {
    const queryableLayers = selectionParam.layers.filter((l) => l.queryable && l.urlWfs);
    if (queryableLayers.length > 0 && queryableLayers[0].urlWfs) {
      if (!queryableLayers.every((layer) => layer.urlWfs === queryableLayers[0].urlWfs)) {
        throw new Error('Not all layers of this list have the same WFS URL. We cannot do one WFS query.');
      }
    }
    return queryableLayers;
  }

  getGeometryColumnNameToFeatureTypes(queryableLayers: LayerWms[]) {
    const geometryColumnNameToFeatureType: Record<string, string[]> = {};
    const featureTypes = queryableLayers.map((l) => l.queryLayers!.split(',')).flat(1);
    for (const featureType of featureTypes) {
      const geometryColumnName = this.featureTypeToGeometryColumnName[featureType];
      if (!(geometryColumnName in geometryColumnNameToFeatureType)) {
        geometryColumnNameToFeatureType[geometryColumnName] = [];
      }
      geometryColumnNameToFeatureType[geometryColumnName].push(featureType);
    }
    return geometryColumnNameToFeatureType;
  }
}
