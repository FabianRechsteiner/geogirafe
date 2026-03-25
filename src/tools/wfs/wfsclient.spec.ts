// SPDX-License-Identifier: Apache-2.0
import { vi, afterAll, describe, expect, it, beforeEach } from 'vitest';
import { GetFeatureOptionsPartial, WfsClientMapServer } from './wfsclient';
import ServerOgc from '../../models/serverogc';
import MockHelper from '../tests/mockhelper';
import IGirafeContext from '../context/icontext';
import LayerWms from '../../models/layers/layerwms';
import ServerWfs from '../../models/serverwfs';

describe('WfsClient', () => {
  let context: IGirafeContext;
  let server: ServerOgc;
  let client: WfsClientMapServer;

  beforeEach(() => {
    context = MockHelper.startMocking();
    vi.resetAllMocks();
    server = new ServerOgc('testOgcServer', {
      url: 'https://wms-1.test.url',
      wfsSupport: true,
      urlWfs: 'https://wfs-1.url',
      type: 'mapserver',
      imageType: 'image/png'
    });
    client = new WfsClientMapServer(
      server,
      { featurePrefix: 'thisIsATest', featureNS: 'https://thisIsATest.com' },
      context
    );
    client['maxFeatures'] = 100;
    context.stateManager.state.position.resolution = 1;
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  describe('checkForException', () => {
    it('catches exceptions and throws an error', () => {
      const mockSource = `
        <ows:ExceptionReport xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ows="http://www.opengis.net/ows" version="1.1.0" language="en-US">
          <ows:Exception exceptionCode="InvalidParameterValue" locator="srsname">
            <ows:ExceptionText>This is a problem</ows:ExceptionText>
          </ows:Exception>
        </ows:ExceptionReport>`;

      expect(() => {
        client['checkForExceptions'](mockSource);
      }).toThrowError('Feature Selection not possible due to a WFS Exception');
    });
  });

  describe('Subclassing WfsClient', () => {
    it('should use the provided options when subclassing the client', () => {
      expect(client['featurePrefix']).toBe('thisIsATest');
    });
  });

  describe('getFeatureOptionsFromSelectionParam', () => {
    it('filters out feature types that ar not currently visible', () => {
      const mockLayer1 = new LayerWms(1, 'testWms1', 1, server, {
        minResolution: 0,
        maxResolution: 100,
        queryLayers: 'layer1',
        queryable: true
      });
      const mockLayer2 = new LayerWms(2, 'testWms2', 2, server, {
        minResolution: 50,
        maxResolution: 100,
        queryLayers: 'layer2',
        queryable: true
      });
      const mockSelectionParam = {
        layers: [mockLayer1, mockLayer2]
      } as any;

      const options = client['getFeatureOptionsFromSelectionParam'](mockSelectionParam);

      // Only layer1 should be queried if the current resolution is 1
      expect(options?.featureTypes).toEqual(['layer1']);
    });
  });

  describe('completeGetFeatureOptions', () => {
    it('does not overwrite partial options except featureTypes and geometryName', async () => {
      const partialOptions: GetFeatureOptionsPartial = {
        featurePrefix: 'abc',
        featureNS: 'https://abc.com',
        maxFeatures: 15,
        featureTypes: ['layer1', 'layer2', 'layer3'],
        geometryName: 'geom'
      };

      // Mock the ServerWfs: return another geometry column name as provided in the partial options
      const wfsServer = new ServerWfs('', client['wfsUrl']);
      vi.spyOn(wfsServer as ServerWfs, 'getGeometryColumnNameToFeatureTypes').mockReturnValue({
        geometry: ['layer1', 'layer2']
      });
      vi.spyOn(client as WfsClientMapServer, 'getServerWfs').mockReturnValue(
        new Promise((resolve) => resolve(wfsServer)) as Promise<ServerWfs>
      );

      const completeOptions = await client['completeGetFeatureOptions'](partialOptions);

      // Client should not overwrite provided partial options
      expect(completeOptions[0].featurePrefix).toBe('abc');
      expect(completeOptions[0].featureNS).toBe('https://abc.com');
      expect(completeOptions[0].maxFeatures).toBe(15);
      // Client should overwrite featureTypes and geometryName
      expect(completeOptions[0].featureTypes).toEqual(['layer1', 'layer2']);
      expect(completeOptions[0].geometryName).toBe('geometry');
    });

    it('does create separate options if there are different geometry column names', async () => {
      const partialOptions: GetFeatureOptionsPartial = {
        featurePrefix: 'abc',
        featureNS: 'https://abc.com',
        maxFeatures: 15,
        featureTypes: ['layer1', 'layer2']
      };

      // Mock the ServerWfs: return another geometry column name as provided in the partial options
      const wfsServer = new ServerWfs('', client['wfsUrl']);
      // Define feature types to have differing geometry column names
      vi.spyOn(wfsServer as ServerWfs, 'getGeometryColumnNameToFeatureTypes').mockReturnValue({
        geometry: ['layer1'],
        geom: ['layer2']
      });
      vi.spyOn(client as WfsClientMapServer, 'getServerWfs').mockReturnValue(
        new Promise((resolve) => resolve(wfsServer)) as Promise<ServerWfs>
      );

      const completeOptions = await client['completeGetFeatureOptions'](partialOptions);

      // Client should not overwrite provided partial options
      expect(completeOptions[0].featurePrefix).toBe('abc');
      expect(completeOptions[0].featureNS).toBe('https://abc.com');
      expect(completeOptions[0].maxFeatures).toBe(15);
      expect(completeOptions[0].featureTypes).toEqual(['layer1']);
      expect(completeOptions[0].geometryName).toBe('geometry');
      // Client should overwrite featureTypes and geometryName
      expect(completeOptions[1].featureTypes).toEqual(['layer2']);
      expect(completeOptions[1].geometryName).toBe('geom');
    });
  });

  describe('describeFeatureType', () => {
    const xmlResponse = `
      <schema
        targetNamespace="http://mapserver.gis.umn.edu/mapserver" 
        xmlns:ms="http://mapserver.gis.umn.edu/mapserver" 
        xmlns:ogc="http://www.opengis.net/ogc"
        xmlns:xsd="http://www.w3.org/2001/XMLSchema"
        xmlns="http://www.w3.org/2001/XMLSchema"
        xmlns:gml="http://www.opengis.net/gml"
        elementFormDefault="qualified" version="0.1" >
        <import namespace="http://www.opengis.net/gml" schemaLocation="http://schemas.opengis.net/gml/3.1.1/base/gml.xsd" />
        
        <element name="testlayer1" type="ms:testlayer1Type" substitutionGroup="gml:_Feature" />
        <complexType name="testlayer1Type">
          <complexContent>
            <extension base="gml:AbstractFeatureType">
              <sequence>
                <element name="geom" type="gml:SurfacePropertyType" minOccurs="0" maxOccurs="1"/>
                <element name="text_de" minOccurs="0" type="string"/>
              </sequence>
            </extension>
          </complexContent>
        </complexType>
      </schema>
    `;

    const mockDescribeFeatureRequest = async (xmlResponse: string) => {
      const describeFeatureTypeResponse = new DOMParser().parseFromString(xmlResponse, 'application/xml');

      // @ts-ignore
      vi.spyOn(client as WfsClientMapServer, 'requestDescribeFeatureType').mockReturnValue(
        // @ts-ignore
        new Promise((resolve) => resolve(describeFeatureTypeResponse)) as Promise<Document>
      );
    };

    it('registers the features type described in the response', async () => {
      await mockDescribeFeatureRequest(xmlResponse);
      const server = await client.getServerWfs();

      expect(server.layers).toBeDefined();
      expect(Object.keys(server.layers)).toContain('testlayer1');
      expect(server.layers['testlayer1']).toEqual([{ name: 'text_de', type: 'string' }]);
    });

    it('registers the feature type even if it does not have any attributes except a geometry', async () => {
      const xmlNoAttributes = xmlResponse.replace('<element name="text_de" minOccurs="0" type="string"/>', '');
      await mockDescribeFeatureRequest(xmlNoAttributes);
      const server = await client.getServerWfs();

      expect(server.layers).toBeDefined();
      expect(Object.keys(server.layers)).toContain('testlayer1');
      expect(server.layers['testlayer1']).toEqual([]);
    });

    it('ignores an attribute if its type is missing', async () => {
      const xmlNoType = xmlResponse.replace(
        '<element name="text_de" minOccurs="0" type="string"/>',
        '<element name="text_de" minOccurs="0"/>'
      );
      await mockDescribeFeatureRequest(xmlNoType);
      const server = await client.getServerWfs();

      expect(server.layers).toBeDefined();
      expect(Object.keys(server.layers)).toContain('testlayer1');
      expect(server.layers['testlayer1']).toEqual([]);
    });

    it('ignores an attribute if its name is missing', async () => {
      const xmlNoAttributeName = xmlResponse.replace(
        '<element name="text_de" minOccurs="0" type="string"/>',
        '<element minOccurs="0" type="string"/>'
      );
      await mockDescribeFeatureRequest(xmlNoAttributeName);
      const server = await client.getServerWfs();

      expect(server.layers).toBeDefined();
      expect(Object.keys(server.layers)).toContain('testlayer1');
      expect(server.layers['testlayer1']).toEqual([]);
    });

    it('ignores the feature type if it does not contain a geometry attribute', async () => {
      const xmlNoGeometry = xmlResponse.replace(
        '<element name="geom" type="gml:SurfacePropertyType" minOccurs="0" maxOccurs="1"/>',
        ''
      );
      await mockDescribeFeatureRequest(xmlNoGeometry);
      const server = await client.getServerWfs();

      expect(server.layers).toBeDefined();
      expect(Object.keys(server.layers)).toEqual([]);
    });

    it('ignores the feature type if the geometry attribute has no geometry name', async () => {
      const xmlNoGeometryName = xmlResponse.replace(
        '<element name="geom" type="gml:SurfacePropertyType" minOccurs="0" maxOccurs="1"/>',
        '<element type="gml:SurfacePropertyType" minOccurs="0" maxOccurs="1"/>'
      );
      await mockDescribeFeatureRequest(xmlNoGeometryName);
      const server = await client.getServerWfs();

      expect(server.layers).toBeDefined();
      expect(Object.keys(server.layers)).toEqual([]);
    });
  });
});
