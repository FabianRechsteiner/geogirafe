import { Feature } from 'ol';
import { Geometry } from 'ol/geom';
import { WFS } from 'ol/format';
import GML3 from 'ol/format/GML3';
import { WriteGetFeatureOptions } from 'ol/format/WFS';

import ConfigManager from '../configuration/configmanager';
import StateManager from '../state/statemanager';
import SelectionParam from '../../models/selectionparam';
import LayerWms from '../../models/layers/layerwms';
import ServerWfs from '../../models/serverwfs';
import { XmlTypes, xmlTypesStrList } from '../../models/xmlTypes';
import ServerOgc from '../../models/serverogc';
import LayerTimeFormatter from '../time/layertimeformatter';
import Filter from 'ol/format/filter/Filter';
import { and } from 'ol/format/filter';

export type WfsClientOptions = {
  featurePrefix: string;
  featureNS: string;
};
export type WfsClientOptionalOptions = {
  featurePrefix?: string;
  featureNS?: string;
};

export default class WfsClient<WfsXmlTypes = XmlTypes> {
  stateManager: StateManager;
  get state() {
    return this.stateManager.state;
  }

  ogcServer: ServerOgc;

  //TODO: make this configurable
  maxFeatures: number = 300;
  featurePrefix: string;
  featureNS: string;

  private readonly urlParameters: URLSearchParams = new URLSearchParams();
  serverWfs: Promise<ServerWfs<WfsXmlTypes>> | undefined;

  constructor(ogcServer: ServerOgc, options: WfsClientOptions) {
    this.ogcServer = ogcServer;
    this.featureNS = options.featureNS;
    this.featurePrefix = options.featurePrefix;

    this.configMaxFeatures();
    this.stateManager = StateManager.getInstance();
  }

  get wfsUrl(): string {
    return this.ogcServer.urlWfs ?? '';
  }

  configMaxFeatures() {
    ConfigManager.getInstance()
      .loadConfig()
      .then((config) => {
        this.maxFeatures = config.selection.maxFeature ?? this.maxFeatures;
      });
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

  async getFeature(selectionParam: SelectionParam): Promise<Feature<Geometry>[]> {
    // First, keep only queryable and visible layers
    // And verify that all layers have the same WFS URL
    const queryableLayers = selectionParam._layers.filter(
      (l) => l.wfsQueryable && l.isVisibleAtResolution(this.state.position.resolution)
    ) as QueryableLayerWms[];
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

    const olFilter: Filter | undefined = queryableLayers[0].filter?.toOpenLayersFilter();
    const timeFilter: Filter | undefined = this.setTimeRestriction(queryableLayers[0]);

    const getFeatureOptions = {
      srsName: selectionParam.srid,
      bbox: selectionParam.selectionBox,
      filter: olFilter && timeFilter ? and(olFilter, timeFilter) : olFilter ?? timeFilter
    };
    const getFeatureRequests = Object.entries(geometryColumnNameToFeatureType).map(async ([columnName, featureTypes]) =>
      this.getFeatureRaw(featureTypes, { geometryName: columnName, ...getFeatureOptions })
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

  async getFeatureRaw(
    featureTypes: string[],
    getFeatureOptions: GetFeatureOptionalOptions
  ): Promise<Feature<Geometry>[]> {
    if (getFeatureOptions.bbox && !getFeatureOptions.geometryName) {
      throw new Error(
        `WFS GetFeature: not possible to query bbox ${getFeatureOptions.bbox} without a geometryName.\nFeatureTypes: ${featureTypes}\nWFS: ${this.wfsUrl}`
      );
    }
    const options = this.completeGetFeatureOptions(featureTypes, getFeatureOptions);
    options.maxFeatures = options.maxFeatures ? options.maxFeatures : this.maxFeatures;

    // WFS GetFeature
    const featureRequest = new WFS().writeGetFeature(options);

    // If URL parameters have been specified, add them to the URL (e.g. TIME parameter)
    const url = new URL(this.wfsUrl);
    for (const [key, value] of this.urlParameters.entries()) {
      url.searchParams.set(key, value);
    }
    const response = await fetch(url, {
      method: 'POST',
      body: new XMLSerializer().serializeToString(featureRequest)
    });

    const gml = await response.text();
    // TODO REG: Do we always want to use the format GML3 here ?
    const features = new GML3().readFeatures(gml);
    return features;
  }

  /**
   * Sets or removes a time restriction on the provided query layer. Depending on the presence of a time attribute,
   * either a temporal XML filter is created or a TIME parameter is added to the URL.
   *
   * @param {QueryableLayerWms} queryLayer - The layer on which the time restriction is to be applied.
   * @return {Filter | undefined} Returns a temporal XML filter if a time attribute exists; otherwise, undefined.
   */
  private setTimeRestriction(queryLayer: QueryableLayerWms): Filter | undefined {
    if (queryLayer.timeAttribute) {
      return this.getTimeRestrictionFilter(queryLayer);
    } else {
      this.addTimeRestrictionAsUrlParameter(queryLayer);
    }
    return undefined;
  }

  private getTimeRestrictionFilter(queryLayer: QueryableLayerWms): Filter | undefined {
    if (queryLayer.timeRestriction && queryLayer.timeAttribute) {
      // Create temporal XML filter
      const timeFormatter = new LayerTimeFormatter(queryLayer.timeOptions);
      return timeFormatter.toOpenLayersWfsFilter(queryLayer.timeRestriction, queryLayer.timeAttribute);
    }
    return undefined;
  }

  private addTimeRestrictionAsUrlParameter(queryLayer: QueryableLayerWms): void {
    if (queryLayer.timeRestriction) {
      // Add time filter as a URL parameter
      this.urlParameters.set('TIME', queryLayer.timeRestriction);
    } else if (this.urlParameters.has('TIME')) {
      // Remove URL parameter if no time restriction is set
      this.urlParameters.delete('TIME');
    }
  }
}

// QueryableLayerWms: a LayerWms where (queryable=true and) urlWfs and are strings (and not null as is possible in LayerWms)
export type QueryableLayerWms = Omit<LayerWms, 'queryLayers'> & {
  queryLayers: string;
};

export type GetFeatureOptionalOptions = Omit<WriteGetFeatureOptions, 'featureNS' | 'featurePrefix' | 'featureTypes'> & {
  featureNS?: string;
  featurePrefix?: string;
  featureTypes?: string[];
};

export class WfsClientMapServer extends WfsClient {
  constructor(ogcServer: ServerOgc, options: WfsClientOptionalOptions) {
    super(ogcServer, { featurePrefix: 'feature', featureNS: 'https://mapserver.gis.umn.edu/mapserver', ...options });
  }
  async getFeatureRaw(featureTypes: string[], getFeatureOptions: GetFeatureOptionalOptions) {
    console.debug('WFS CLIENT MAPSERVER getFeatureRaw() featureTypes:', featureTypes);
    return super.getFeatureRaw(featureTypes, getFeatureOptions);
  }
}

export class WfsClientQgis extends WfsClient {
  constructor(ogcServer: ServerOgc, options: WfsClientOptionalOptions) {
    super(ogcServer, { featurePrefix: 'feature', featureNS: 'https://www.qgis.org/gml', ...options });
  }
  async getFeatureRaw(featureTypes: string[], getFeatureOptions: GetFeatureOptionalOptions) {
    console.debug('WFS CLIENT QGIS getFeatureRaw() featureTypes:', featureTypes);
    return super.getFeatureRaw(featureTypes, getFeatureOptions);
  }
}

export const WfsClientDefault = WfsClientQgis;
export const WfsClientGeoServer = WfsClientMapServer;
