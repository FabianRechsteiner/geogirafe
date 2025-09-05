import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest';
import PermalinkManager from './permalinkmanager';
import MockHelper from '../tests/mockhelper';
import { get as getProjection } from 'ol/proj';
import MapPosition from '../state/mapposition';

let permalinkManager: PermalinkManager;

const emptyUrlParameters = {
  map_x: null,
  map_y: null,
  map_zoom: null,
  map_crosshair: null,
  map_tooltip: null,
  search: null
};

const mockLocation = (url: string) => {
  const originalLocation = window.location;
  vi.spyOn(window, 'location', 'get').mockImplementation(() => ({
    ...originalLocation,
    href: url
  }));
  vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
};

describe('PermalinkManager', () => {
  beforeAll(() => {
    MockHelper.startMocking();
    permalinkManager = PermalinkManager.getInstance();
  });

  afterEach(() => {
    permalinkManager.params = {};
  });

  afterAll(() => {
    MockHelper.stopMocking();
    vi.restoreAllMocks();
  });

  it('should handle an URL without any permalink parameters', () => {
    mockLocation('http://example.com?');
    permalinkManager['getPermalinkParamsFromUrl']();

    expect(permalinkManager.params).toEqual(emptyUrlParameters);
  });

  it('should read out the map position parameters and create a valid map position', () => {
    mockLocation(
      'http://example.com?' +
        'map_x=2000' +
        '&map_y=1000' +
        '&map_zoom=2' +
        '&map_crosshair=true' +
        '&map_tooltip=testTooltip'
    );
    permalinkManager['getPermalinkParamsFromUrl']();

    expect(permalinkManager.params).toEqual({
      ...emptyUrlParameters,
      map_x: '2000',
      map_y: '1000',
      map_zoom: '2',
      map_crosshair: 'true',
      map_tooltip: 'testTooltip'
    });

    const exptectedMapPosition = new MapPosition();
    exptectedMapPosition.center = [2000, 1000];
    exptectedMapPosition.zoom = 2;
    exptectedMapPosition.crosshair = [2000, 1000];
    exptectedMapPosition.tooltip = {
      content: 'testTooltip',
      position: [2000, 1000]
    };

    expect(permalinkManager.getMapPosition(getProjection('EPSG:2056')!)).toEqual(exptectedMapPosition);
  });

  it('should read out the wfs query parameters', () => {
    mockLocation('http://example.com?wfs_layer=testlayer&wfs_attr1=22&wfs_attr2=testValue');
    permalinkManager['getPermalinkParamsFromUrl']();

    expect(permalinkManager.params).toEqual({
      ...emptyUrlParameters,
      wfs_layer: 'testlayer',
      wfs_attr1: '22',
      wfs_attr2: 'testValue'
    });

    const expectedWfsParams = {
      layer: 'testlayer',
      properties: [
        {
          name: 'attr1',
          value: '22'
        },
        {
          name: 'attr2',
          value: 'testValue'
        }
      ]
    };

    expect(permalinkManager.getFeatureSelectionQuery()).toEqual(expectedWfsParams);
  });

  it('should should prioritize wfs query parameters before map position parameters', () => {
    mockLocation(
      'http://example.com?' +
        'map_x=2000' +
        '&map_y=1000' +
        '&map_zoom=2' +
        '&map_crosshair=true' +
        '&map_tooltip=testTooltip' +
        '&wfs_layer=testlayer' +
        '&wfs_attr1=22' +
        '&wfs_attr2=testValue'
    );
    permalinkManager['getPermalinkParamsFromUrl']();

    expect(permalinkManager.hasFeatureSelectionQuery()).toEqual(true);
    expect(permalinkManager.hasMapPosition()).toEqual(false);
    expect(permalinkManager.getMapPosition(getProjection('EPSG:2056')!)).toEqual(undefined);
  });
});
