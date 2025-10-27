import { describe, expect, it, afterAll } from 'vitest';
import { WfsClientMapServer } from './wfsclient';
import ServerOgc from '../../models/serverogc';
import MockHelper from '../tests/mockhelper';

describe('WfsClient', () => {
  MockHelper.startMocking();

  afterAll(() => {
    MockHelper.startMocking();
  });

  const client = new WfsClientMapServer(
    new ServerOgc('testOgcServer', {
      url: 'https://wms-1.test.url',
      wfsSupport: true,
      urlWfs: 'https://wfs-1.url',
      type: 'mapserver',
      imageType: 'image/png'
    }),
    {
      featurePrefix: '',
      featureNS: ''
    }
  );

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
});
