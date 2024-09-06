import { Feature } from 'ol';
import { Geometry } from 'ol/geom';
import { WFS } from 'ol/format';
import GML3 from 'ol/format/GML3';
import { WriteGetFeatureOptions } from 'ol/format/WFS';

import ConfigManager from '../configuration/configmanager';
import StateManager from '../state/statemanager';
import { SelectionParam } from '../state/state';
import LayerWms from '../../models/layers/layerwms';
import ServerWfs from '../../models/serverwfs';
import WfsFilter from './wfsfilter';
import { XmlTypes, xmlTypesStrList } from '../../models/xmlTypes';
import ServerOgc from '../../models/serverogc';

abstract class AbstractWfsQueryManager<WfsXmlTypes = XmlTypes> {
  stateManager: StateManager;
  get state() {
    return this.stateManager.state;
  }

  wfsUrl: string;

  //TODO: make this configurable
  maxFeatures: number = 300;
  featurePrefix: string;
  featureNS: string;

  serverWfs: Promise<ServerWfs<WfsXmlTypes>> | undefined;

  constructor(wfsUrl: string, featurePrefix: string, featureNS: string) {
    this.wfsUrl = wfsUrl;
    this.featureNS = featureNS;
    this.featurePrefix = featurePrefix;

    ConfigManager.getInstance()
      .loadConfig()
      .then((config) => {
        this.maxFeatures = config.selection.maxFeature ?? this.maxFeatures;
      });
    this.stateManager = StateManager.getInstance();
  }

  getServerWfs(): Promise<ServerWfs<WfsXmlTypes>> {
    return this.describeFeatureType();
  }

  describeFeatureType(): Promise<ServerWfs<WfsXmlTypes>> {
    if (!this.serverWfs) {
      this.serverWfs = this.#describeFeatureType();
      this.serverWfs.catch((error) => {
        const msg = 'WFS server with URL ' + this.wfsUrl + ' could not be initialized.';
        console.error(msg + ' Error:', error);
        this.serverWfs = undefined;
      });
    }

    return this.serverWfs;
  }

  async #describeFeatureType() {
    const serverWfs = new ServerWfs<WfsXmlTypes>('', this.wfsUrl);
    const url = this.getDescribeFeatureTypeUrl();
    const response = await fetch(url);
    const content = await response.text();
    const xml = new DOMParser().parseFromString(content, 'text/xml');

    // First find all direct "element" childs
    const elementTypeToName = this.getElementToTypeName(xml);

    // Then, find all "complexType" elements
    const tags = xml.getElementsByTagName('complexType');
    for (const tag of tags) {
      this.initializeAttribute(tag, serverWfs, elementTypeToName);
    }

    // This WFS is now initialized
    serverWfs.initialized = true;
    return serverWfs;
  }

  private initializeAttribute(
    tag: Element,
    serverWfs: ServerWfs<WfsXmlTypes>,
    elementTypeToName: Record<string, string>
  ) {
    // takes an xml element, extract the attribute's type and name
    // adds it to the serverWfs featureType
    const typeName = tag.getAttribute('name');
    if (!typeName) {
      throw new Error('Could not find a name for the complex type');
    }

    const featureType = elementTypeToName[typeName];
    const elements = tag.getElementsByTagName('sequence')[0].getElementsByTagName('element');

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

  manageLayerAttribute(serverWfs: ServerWfs<WfsXmlTypes>, element: Element, featureType: string) {
    let geometryAttributeFound: boolean = false;
    const type = element.getAttribute('type');

    if (type?.startsWith('gml:')) {
      // We are on the geometry attribute
      const geometryAttributeName = element.getAttribute('name');
      if (geometryAttributeName) {
        serverWfs.featureTypeToGeometryColumnName[featureType] = geometryAttributeName;
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
      } else if (this.validateLayerAttributeType(attrType)) {
        serverWfs.addLayerAttribute(featureType, attrName, attrType);
      } else {
        console.warn(
          `Unmanaged layer attribute type: ${attrType} for attribute ${attrName} of featureType ${featureType}. ${attrName} ignored.`
        );
      }
    }

    return geometryAttributeFound;
  }

  validateLayerAttributeType(type: string) {
    return xmlTypesStrList.includes(type);
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
        console.log('What happend with this element? element', element);
      }
    }

    return elementTypeToName;
  }

  getDescribeFeatureTypeUrl() {
    const url = new URL(this.wfsUrl);
    url.searchParams.set('service', 'WFS');
    url.searchParams.set('request', 'DescribeFeatureType');
    // TODO REG: Manage different WFS versions
    url.searchParams.set('version', '1.1.0');

    return url.href;
  }

  async wfsQuery(selectionParam: SelectionParam): Promise<Feature<Geometry>[]> {
    // First, keep only queryable layers
    // And verify that all layers have the same WFS URL
    const queryableLayers = this.getQueryableLayers(selectionParam);
    if (queryableLayers.length <= 0) {
      return [];
    }

    // Ensure the WFS server is initialized
    const serverWfs = await this.getServerWfs();

    // Get the geometry column name of each layer
    // TODO REG : (not sure) This could probably be simplify by initializing a property in the ServerWfs object
    // containing the name of the geometry column during the WFS initialization.
    const featureTypes = queryableLayers.map((l) => l.queryLayers.split(',')).flat(1);
    const geometryColumnNameToFeatureType = serverWfs.getGeometryColumnNameToFeatureTypes(featureTypes);

    const olFilter = queryableLayers[0].filter?.toOpenLayersFilter();

    const getFeatureOptions = {
      srsName: selectionParam.srid,
      bbox: selectionParam.selectionBox,
      filter: olFilter
    };
    const getFeatureRequests = Object.entries(geometryColumnNameToFeatureType).map(async ([columnName, featureTypes]) =>
      this.getFeature(featureTypes, { geometryName: columnName, ...getFeatureOptions })
    );

    const getFeatureResponses = await Promise.all(getFeatureRequests);
    const selectedFeatures = getFeatureResponses.flat();
    return selectedFeatures;
  }

  completeGetFeatureOptions(featureTypes: string[], options: GetFeatureOptionalOptions): WriteGetFeatureOptions {
    return {
      featurePrefix: this.featurePrefix,
      featureNS: this.featureNS,
      ...options,
      featureTypes: featureTypes
    } as WriteGetFeatureOptions;
  }

  async getFeature(featureTypes: string[], getFeatureOptions: GetFeatureOptionalOptions): Promise<Feature<Geometry>[]> {
    if (getFeatureOptions.bbox && !getFeatureOptions.geometryName) {
      throw new Error(
        `WFS GetFeature: not possible to query bbox ${getFeatureOptions.bbox} without a geometryName.\nFeatureTypes: ${featureTypes}\nWFS: ${this.wfsUrl}`
      );
    }
    const options = this.completeGetFeatureOptions(featureTypes, getFeatureOptions);
    options.maxFeatures = options.maxFeatures ? options.maxFeatures : this.maxFeatures;

    // WFS GetFeature
    const featureRequest = new WFS().writeGetFeature(options);

    const response = await fetch(this.wfsUrl, {
      method: 'POST',
      body: new XMLSerializer().serializeToString(featureRequest)
    });

    const gml = await response.text();
    // TODO REG: Do we always want to use the format GML3 here ?
    const features = new GML3().readFeatures(gml);
    return features;
  }

  getQueryableLayers(selectionParam: SelectionParam): QueryableLayerWms[] {
    const queryableLayers = selectionParam._layers.filter((l) => l.queryable);
    if (queryableLayers.length === 0) {
      return [];
    }
    // should all have the same URL because we want to do one WFS query.
    const sameUrlForAll = queryableLayers.every((layer: LayerWms) => {
      return layer.ogcServer.urlWfs === this.wfsUrl;
    });
    if (!sameUrlForAll) {
      const layersErrorFeedback = queryableLayers
        .map((l) => '- layer name: ' + l.name + ': ' + ', layer WFS URL: ' + l.ogcServer.urlWfs)
        .join('\n');
      throw new Error(
        'Not all layers of this list have the same WFS URL:\n' + layersErrorFeedback + '\nWe cannot do que WFS query.\n'
      );
    }
    return queryableLayers.map((l) => l as QueryableLayerWms);
  }

  public wmsGetMapFilter(layer: LayerWms): string {
    if (!layer.hasFilter) {
      return '';
    }
    const filter = layer.filter as WfsFilter;
    const nbQuerylayers = layer.queryLayers!.split(',').length;

    return '(' + filter.toSimpleXmlFilter().repeat(nbQuerylayers) + ')';
  }
}

// QueryableLayerWms: a LayerWms where (queryable=true and) urlWfs and are strings (and not null as is possible in LayerWms)
export type QueryableLayerWms = Omit<LayerWms, 'urlWfs' | 'queryLayers'> & {
  ogcServer: ServerOgc;
  queryLayers: string;
};

export type GetFeatureOptionalOptions = Omit<WriteGetFeatureOptions, 'featureNS' | 'featurePrefix' | 'featureTypes'> & {
  featureNS?: string;
  featurePrefix?: string;
  featureTypes?: string[];
};

export default AbstractWfsQueryManager;
