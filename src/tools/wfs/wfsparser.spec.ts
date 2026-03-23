// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';
import WfsParser from './wfsparser';
import { Options } from 'ol/format/WFS';
import GML32 from 'ol/format/GML32';

describe('WfsParser', () => {
  describe('readFeatures', () => {
    it('should call readFeaturesGML32 for WFS 2.0.0 response', () => {
      const options: Options = { featureNS: 'http://example.com', version: '2.0.0' };
      const parser = new WfsParser(options);
      const readFeaturesGML32Spy = vi.spyOn(parser as any, 'readFeaturesGML32');
      const mockSource = '<FeatureCollection></FeatureCollection>';

      parser.readFeatures(mockSource);

      expect(readFeaturesGML32Spy).toHaveBeenCalledWith(mockSource, undefined);
    });

    it('should not call readFeaturesGML32 for WFS 1.1.0 response', () => {
      const options: Options = { featureNS: 'http://example.com', version: '1.1.0' };
      const parser = new WfsParser(options);
      const readFeaturesGML32Spy = vi.spyOn(parser as any, 'readFeaturesGML32');
      const mockSource = '<FeatureCollection></FeatureCollection>';

      parser.readFeatures(mockSource);

      expect(readFeaturesGML32Spy).not.toHaveBeenCalledWith(mockSource, undefined);
    });

    it('should not call readNestedFeatureCollectionsGML32 for non-nested WFS 2.0.0 response', () => {
      const options: Options = { featureNS: 'http://example.com', version: '2.0.0' };
      const parser = new WfsParser(options);
      const readNestedFeatureCollectionsGML32 = vi.spyOn(parser as any, 'readNestedFeatureCollectionsGML32');
      const mockSource = '<FeatureCollection><member></member></FeatureCollection>';

      parser.readFeatures(mockSource);

      expect(readNestedFeatureCollectionsGML32).not.toHaveBeenCalledWith(mockSource, undefined);
    });

    it('should handle non-nested feature collections in WFS 2.0.0 responses', () => {
      const options: Options = {
        version: '2.0.0',
        featureType: ['gg:apiary', 'gg:fields'],
        featureNS: { gg: 'https://www.opengis.ch/gg' }
      };
      const parser = new WfsParser(options);
      const mockSource = `
        <FeatureCollection 
          xmlns="http://www.opengis.net/wfs/2.0" 
          xmlns:gml="http://www.opengis.net/gml/3.2"
          xmlns:gg="https://www.opengis.ch/gg"
          >
          <member>
            <gg:apiary gml:id="gg:apiary.0">
              <gg:fid>2</gg:fid>
            </gg:apiary>
          </member>
          <member>
            <gg:apiary gml:id="gg:apiary.1">
              <gg:fid>4</gg:fid>
            </gg:apiary>
          </member>
          <member>
            <gg:fields gml:id="gg:fields.0">
              <gg:fid>36</gg:fid>
            </gg:fields>
          </member>
        </FeatureCollection>`;

      const features = (parser as any).readFeaturesGML32(mockSource);

      expect(features).toBeInstanceOf(Array);
      expect(features.length).toBe(3);
    });
  });

  describe('readNestedFeatureCollectionsGML32', () => {
    it('should return an empty array for empty sources', () => {
      const options: Options = { gmlFormat: new GML32() };
      const parser = new WfsParser(options);
      const domParser = new DOMParser();
      const doc = domParser.parseFromString('', 'application/xml');
      const features = (parser as any)['readNestedFeatureCollectionsGML32'](doc);

      expect(features).toEqual([]);
    });

    it('should handle nested feature collections in WFS 2.0.0 responses', () => {
      const options: Options = {
        version: '2.0.0',
        featureType: ['gg:apiary', 'gg:fields'],
        featureNS: { gg: 'https://www.opengis.ch/gg' }
      };
      const parser = new WfsParser(options);
      const mockSource = `
        <FeatureCollection 
          xmlns="http://www.opengis.net/wfs/2.0" 
          xmlns:gml="http://www.opengis.net/gml/3.2"
          xmlns:gg="https://www.opengis.ch/gg"
          >
          <member>
            <FeatureCollection>
              <member>
                <gg:apiary gml:id="gg:apiary.0">
                  <gg:fid>2</gg:fid>
                </gg:apiary>
              </member>
              <member>
                <gg:apiary gml:id="gg:apiary.1">
                  <gg:fid>4</gg:fid>
                </gg:apiary>
              </member>
            </FeatureCollection>
          </member>
          <member>
            <FeatureCollection>
              <member>
                <gg:fields gml:id="gg:fields.0">
                  <gg:fid>36</gg:fid>
                </gg:fields>
              </member>
            </FeatureCollection>
          </member>
        </FeatureCollection>`;

      const domParser = new DOMParser();
      const doc = domParser.parseFromString(mockSource, 'application/xml');
      const features = (parser as any)['readNestedFeatureCollectionsGML32'](doc);

      expect(features).toBeInstanceOf(Array);
      expect(features.length).toBe(3);
    });

    // it('original WFS parser should handler nested feature colelctions if the GML reader is manipulated', () => {
    //   const gml32Format = new GML32({
    //     featureNS: { gg: 'https://www.opengis.ch/gg' },
    //     featureType: ['gg:apiary', 'gg:fields']
    //   });
    //   const wfsNs = 'http://www.opengis.net/wfs/2.0'; // NOSONAR
    //   gml32Format.FEATURE_COLLECTION_PARSERS[wfsNs] = {
    //     member: makeArrayPusher(gml32Format.readFeaturesInternal),
    //     FeatureCollection: makeArrayPusher(gml32Format.readFeaturesInternal)
    //   };
    //   const parser = new WFS({
    //     version: '2.0.0',
    //     featureNS: { gg: 'https://www.opengis.ch/gg' },
    //     featureType: ['gg:apiary', 'gg:fields'],
    //     gmlFormat: gml32Format
    //   });
    //
    //   const mockSource = `
    //     <FeatureCollection
    //       xmlns="http://www.opengis.net/wfs/2.0"
    //       xmlns:gml="http://www.opengis.net/gml/3.2"
    //       xmlns:gg="https://www.opengis.ch/gg"
    //       >
    //       <member>
    //         <FeatureCollection>
    //           <member>
    //             <gg:apiary gml:id="gg:apiary.0">
    //               <gg:fid>2</gg:fid>
    //             </gg:apiary>
    //           </member>
    //           <member>
    //             <gg:apiary gml:id="gg:apiary.1">
    //               <gg:fid>4</gg:fid>
    //             </gg:apiary>
    //           </member>
    //         </FeatureCollection>
    //       </member>
    //       <member>
    //         <FeatureCollection>
    //           <member>
    //             <gg:fields gml:id="gg:fields.0">
    //               <gg:fid>36</gg:fid>
    //             </gg:fields>
    //           </member>
    //         </FeatureCollection>
    //       </member>
    //     </FeatureCollection>`;
    //
    //   const features = parser.readFeatures(mockSource);
    //   expect(features).toBeInstanceOf(Array);
    //   expect(features.length).toBe(3);
    // });
  });

  describe('hasNestedFeatureCollectionsGML32', () => {
    it('should detect nested feature collections', () => {
      const parser = new WfsParser({ version: '2.0.0' });
      const mockDoc = new DOMParser().parseFromString(
        `<FeatureCollection>
            <member>
              <FeatureCollection>
               <member>
                 <feature></feature>
               </member>
             </FeatureCollection>
            </member>
         </FeatureCollection>`,
        'application/xml'
      );

      const result = (parser as any).hasNestedFeatureCollectionsGML32(mockDoc);

      expect(result).toBe(true);
    });

    it('should return false for not nested feature collections', () => {
      const parser = new WfsParser({ version: '2.0.0' });
      const mockDoc = new DOMParser().parseFromString(
        `<FeatureCollection>
           <member>
             <feature></feature>
           </member>
         </FeatureCollection>`,
        'application/xml'
      );

      const result = (parser as any).hasNestedFeatureCollectionsGML32(mockDoc);

      expect(result).toBe(false);
    });
  });
});
