// SPDX-License-Identifier: Apache-2.0
import { Feature } from 'ol';
import { Geometry } from 'ol/geom';
import WfsParser from './wfsparser';
import { WriteGetFeatureOptions } from 'ol/format/WFS';
import SelectionParam from '../../models/selectionparam';
import LayerWms from '../../models/layers/layerwms';
import ServerWfs from '../../models/serverwfs';
import { XmlTypes, xmlTypesStrList } from '../../models/xmlTypes';
import ServerOgc from '../../models/serverogc';
import LayerTimeFormatter from '../time/layertimeformatter';
import Filter from 'ol/format/filter/Filter';
import { and } from 'ol/format/filter';
import IGirafeContext from '../context/icontext';

export type WfsClientOptions = {
  featurePrefix: string;
  featureNS: string;
};
export type WfsClientOptionalOptions = {
  featurePrefix?: string;
  featureNS?: string;
};

export default class WfsClient<WfsXmlTypes = XmlTypes> {
  private readonly context: IGirafeContext;
  protected version: string = '1.1.0';

  private get state() {
    return this.context.stateManager.state;
  }

  protected ogcServer: ServerOgc;

  protected maxFeatures!: number;
  protected featurePrefix: string;
  protected featureNS: string;
  protected featureNsWithPrefix: Record<string, string> = {};

  private readonly urlParameters: URLSearchParams = new URLSearchParams();
  private serverWfs: Promise<ServerWfs<WfsXmlTypes>> | undefined;

  public constructor(ogcServer: ServerOgc, options: WfsClientOptions, context: IGirafeContext) {
    this.ogcServer = ogcServer;
    this.featureNS = options.featureNS;
    this.featurePrefix = options.featurePrefix;
    this.featureNsWithPrefix[this.featurePrefix] = this.featureNS;
    this.context = context;
    this.configMaxFeatures();
    this.version = this.extractVersionFromUrl(this.wfsUrl);
  }

  private get wfsUrl(): string {
    return this.ogcServer.urlWfs ?? '';
  }

  private extractVersionFromUrl(url: string): string {
    const urlObj = new URL(url);
    const version = urlObj.searchParams.get('version');
    if (version) {
      return version;
    } else {
      return this.version;
    }
  }

  private configMaxFeatures() {
    this.maxFeatures = this.context.configManager.Config.selection.maxFeature ?? this.maxFeatures;
  }

  public getServerWfs(): Promise<ServerWfs<WfsXmlTypes>> {
    return this.describeFeatureType();
  }

  protected describeFeatureType(): Promise<ServerWfs<WfsXmlTypes>> {
    if (!this.serverWfs) {
      this.serverWfs = this.describeFeatureTypeInternal();
      this.serverWfs.catch((error) => {
        const msg = `WFS server with URL ${this.wfsUrl} could not be initialized. Error: `;
        console.error(msg, error);
        this.serverWfs = undefined;
      });
    }

    return this.serverWfs;
  }

  private async describeFeatureTypeInternal() {
    const serverWfs = new ServerWfs<WfsXmlTypes>('', this.wfsUrl);
    const url = this.getDescribeFeatureTypeUrl();
    const response = await fetch(url);
    const content = await response.text();
    const xml = new DOMParser().parseFromString(content, 'text/xml');

    // First, find all direct "element" children
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
    // Takes an XML element, extract the attribute's type and name
    // Adds it to the serverWfs featureType
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

  protected manageLayerAttribute(serverWfs: ServerWfs<WfsXmlTypes>, element: Element, featureType: string) {
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
      // We are not on a geometry attribute, but on a normal attribute
      // We update the WMS Layer with its attribute information
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

  protected validateLayerAttributeType(type: string) {
    return xmlTypesStrList.includes(type);
  }

  protected getElementToTypeName(xml: Document) {
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

  protected getDescribeFeatureTypeUrl() {
    const url = new URL(this.wfsUrl);
    url.searchParams.set('service', 'WFS');
    url.searchParams.set('request', 'DescribeFeatureType');
    url.searchParams.set('version', this.version);

    return url.href;
  }

  /**
   * Gets features from a WFS server.
   * Configure the request by providing a GeoGirafe `SelectionParam` or an ol `GetFeatureOptions` object.
   */
  public async getFeature(options: SelectionParam): Promise<Feature<Geometry>[]>;
  public async getFeature(options: GetFeatureOptionsPartial): Promise<Feature<Geometry>[]>;
  public async getFeature(options: SelectionParam | GetFeatureOptionsPartial): Promise<Feature<Geometry>[]> {
    let partialOptions: GetFeatureOptionsPartial | null;
    if (options instanceof SelectionParam) {
      partialOptions = this.getFeatureOptionsFromSelectionParam(options);
    } else {
      partialOptions = options;
      this.removeTimeRestrictionAsUrlParameter();
    }
    if (!partialOptions) {
      return [];
    }

    const getFeatureOptions = await this.completeGetFeatureOptions(partialOptions);

    // Create a request for each getFeatureOptions object
    const getFeatureRequests = getFeatureOptions.map(async (options) => this.getFeatureRaw(options));

    const getFeatureResponses = await Promise.all(getFeatureRequests);
    return getFeatureResponses.flat();
  }

  /**
   * Transforms a `SelectionParam` object, originating from a map selection,
   * into a `GetFeatureOptionsPartial` object, needed for performing the WFS GetFeature request.
   */
  protected getFeatureOptionsFromSelectionParam(selectionParam: SelectionParam): GetFeatureOptionsPartial | null {
    // First, keep only queryable and visible layers and verify that all layers have the same WFS URL
    const currentResolution = this.state.position.resolution;
    if (!currentResolution) {
      console.log('WFSClient called before resolution is set.');
      return null;
    }
    const queryableLayers = selectionParam.layers.filter(
      (l) => l.wfsQueryable && l.isVisibleAtResolution(currentResolution)
    ) as QueryableLayerWms[];
    if (queryableLayers.length <= 0) {
      return null;
    }

    const featureTypes = queryableLayers
      .map((l) =>
        l.queryLayers
          .split(',')
          .filter((el) =>
            LayerWms.isInVisibleRange(
              currentResolution,
              l.queryLayersRanges[el]?.minResolution,
              l.queryLayersRanges[el]?.maxResolution
            )
          )
      )
      .flat(1);

    // Attribute filter based on URL parameters in permalink
    const featureSelectionFilter: Filter[] | undefined = selectionParam.selectionQuery?.map((f) =>
      f.toOpenLayersFilter()
    );
    // Layer tree attribute filter
    const layerFilter: Filter | undefined = queryableLayers[0].filter?.toOpenLayersFilter();
    // Layer tree time filter
    const timeFilter: Filter | undefined = this.setTimeRestriction(queryableLayers[0]);
    const filterList: Filter[] = [featureSelectionFilter, layerFilter, timeFilter]
      .flat()
      .filter((f) => f !== undefined);

    // Combine filter with an AND operator
    let combinedFilters: Filter | undefined = undefined;
    if (filterList.length > 1) {
      combinedFilters = and(...filterList);
    } else if (filterList.length === 1) {
      combinedFilters = filterList[0];
    }

    return {
      featureTypes: featureTypes,
      srsName: selectionParam.srid,
      bbox: selectionParam.selectionBox,
      filter: combinedFilters
    } as GetFeatureOptionsPartial;
  }

  /**
   * Creates a `WriteGetFeatureOptions` object by expanding the provided partial options.
   * Required for a ol GetFeature WFS request.
   */
  protected async completeGetFeatureOptions(options: GetFeatureOptionsPartial): Promise<WriteGetFeatureOptions[]> {
    if (!options.featureTypes || options.featureTypes.length === 0) {
      throw new Error(`WFS GetFeature: no feature types specified, not able to query.\nWFS: ${this.wfsUrl}`);
    }
    // Ensure the WFS server is initialized
    const serverWfs = await this.getServerWfs();

    // Organize layers by their geometry column name in the form of: <geometry column name, layer list>
    const geometryColumnNameToFeatureType = serverWfs.getGeometryColumnNameToFeatureTypes(options.featureTypes);

    // Create option objects for each group of feature types that share the same geometry column name
    //  Add missing feature prefix and namespace to the options
    return Object.entries(geometryColumnNameToFeatureType).map(([geomColumnName, featureTypesPerGeom]) => {
      return {
        featurePrefix: this.featurePrefix,
        featureNS: this.featureNS,
        maxFeatures: this.maxFeatures,
        ...options,
        featureTypes: featureTypesPerGeom,
        geometryName: geomColumnName
      };
    });
  }

  /**
   * Sends a GetFeature request to a WFS endpoint based on provided options and parses the received GML answer.
   */
  protected async getFeatureRaw(getFeatureOptions: WriteGetFeatureOptions): Promise<Feature<Geometry>[]> {
    if (getFeatureOptions.bbox && !getFeatureOptions.geometryName) {
      throw new Error(
        `WFS GetFeature: not possible to query bbox ${getFeatureOptions.bbox} without a geometryName.\n
        FeatureTypes: ${getFeatureOptions.featureTypes}\nWFS: ${this.wfsUrl}`
      );
    }

    const wfs = new WfsParser({
      version: this.version,
      featureNS: this.featureNsWithPrefix,
      featureType: getFeatureOptions.featureTypes.map((ft) => `${this.featurePrefix}:${ft}`)
    });
    const featureRequest = wfs.writeGetFeature(getFeatureOptions);

    const url = new URL(this.wfsUrl);
    // If URL parameters have been specified, add them to the URL (e.g. TIME parameter)
    for (const [key, value] of this.urlParameters.entries()) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      method: 'POST',
      body: new XMLSerializer().serializeToString(featureRequest)
    });

    const gml = await response.text();

    this.checkForExceptions(gml);

    return wfs.readFeatures(gml);
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

  private addTimeRestrictionAsUrlParameter(queryLayer?: QueryableLayerWms): void {
    if (queryLayer?.timeRestriction) {
      // Add time filter as a URL parameter
      this.urlParameters.set('TIME', queryLayer.timeRestriction);
    } else {
      this.removeTimeRestrictionAsUrlParameter();
    }
  }

  private removeTimeRestrictionAsUrlParameter(): void {
    if (this.urlParameters.has('TIME')) {
      this.urlParameters.delete('TIME');
    }
  }

  private checkForExceptions(source: string): void {
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(source, 'application/xml');
    const ns = 'http://www.opengis.net/ows'; // NOSONAR

    const exceptionReport = doc.getElementsByTagNameNS(ns, 'ExceptionReport')[0];
    if (exceptionReport) {
      const exception = exceptionReport.getElementsByTagNameNS(ns, 'Exception')[0];
      const message = exception?.getElementsByTagNameNS(ns, 'ExceptionText')[0]?.textContent;
      console.error(`WFS Exception: ${message || 'Unknown error'}`);
      throw new Error(`Feature Selection not possible due to a WFS Exception`);
    }
  }
}

// QueryableLayerWms: a LayerWms where (queryable=true and) urlWfs and are strings (and not null as is possible in LayerWms)
export type QueryableLayerWms = Omit<LayerWms, 'queryLayers'> & {
  queryLayers: string;
};

export type GetFeatureOptionsPartial = Omit<WriteGetFeatureOptions, 'featureNS' | 'featurePrefix' | 'featureTypes'> & {
  featureNS?: string;
  featurePrefix?: string;
  featureTypes: string[];
};

export class WfsClientMapServer extends WfsClient {
  public constructor(ogcServer: ServerOgc, options: WfsClientOptionalOptions, context: IGirafeContext) {
    super(ogcServer, { featurePrefix: 'ms', featureNS: 'http://mapserver.gis.umn.edu/mapserver', ...options }, context); // NOSONAR
  }
}

export class WfsClientQgis extends WfsClient {
  public constructor(ogcServer: ServerOgc, options: WfsClientOptionalOptions, context: IGirafeContext) {
    super(ogcServer, { featurePrefix: 'qgs', featureNS: 'http://www.qgis.org/gml', ...options }, context); // NOSONAR
  }
}

export class WfsClientGeorama extends WfsClient {
  protected override version = '2.0.0';
  public constructor(ogcServer: ServerOgc, options: WfsClientOptionalOptions, context: IGirafeContext) {
    super(ogcServer, { featurePrefix: 'georama', featureNS: 'https://www.opengis.ch/georama', ...options }, context);
  }
}

export const WfsClientDefault = WfsClientQgis;
export const WfsClientGeoServer = WfsClientMapServer;
