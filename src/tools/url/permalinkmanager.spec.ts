// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest';
import PermalinkManager from './permalinkmanager';
import MockHelper from '../tests/mockhelper';
import { get as getProjection } from 'ol/proj';
import MapPosition from '../state/mapposition';
import IGirafeContext from '../context/icontext';
import StateManager from '../state/statemanager';
import { BASEMAP_VISIBLE_PARAMETER, SEARCH_VISIBLE_PARAMETER } from './permalinkmanager-constants';

let context: IGirafeContext;
let permalinkManager: PermalinkManager;
let stateManager: StateManager;

const emptyUrlParameters = {
  map_x: null,
  map_y: null,
  map_zoom: null,
  map_crosshair: null,
  map_tooltip: null,
  map_marker: null,
  search: null,
  basemap: null,
  themes: null,
  groups: null,
  layers: null,
  searchVisible: null,
  basemapVisible: null
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
    context = MockHelper.startMocking();
    permalinkManager = context.permalinkManager;
    stateManager = context.stateManager;
  });

  afterEach(() => {
    // @ts-expect-error: private property
    permalinkManager.params = {};
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
    vi.restoreAllMocks();
  });

  it('should handle an URL without any permalink parameters', () => {
    mockLocation('http://example.com?');
    permalinkManager['getPermalinkParamsFromUrl']();

    // @ts-expect-error: private property
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

    // @ts-expect-error: private property
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

    // @ts-expect-error: private property
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

  it('should set visibility of search to true when parameter is missing', () => {
    mockLocation('http://example.com?');
    permalinkManager['getPermalinkParamsFromUrl']();
    permalinkManager['setStateFromParams']();

    expect(permalinkManager.hasSearchVisible()).toEqual(false);
    expect(stateManager.state.interface.searchComponentVisible).toEqual(true);
  });
  it('should set visibility of search to true when parameter contains no valid boolean', () => {
    mockLocation(`http://example.com?${SEARCH_VISIBLE_PARAMETER}=katze`);
    permalinkManager['getPermalinkParamsFromUrl']();
    permalinkManager['setStateFromParams']();

    expect(permalinkManager.hasSearchVisible()).toEqual(true);
    expect(permalinkManager.getSearchVisible()).toEqual(undefined);
    expect(stateManager.state.interface.searchComponentVisible).toEqual(true);
  });
  it('should set visibility of search to false when parameter contains 0', () => {
    mockLocation(`http://example.com?${SEARCH_VISIBLE_PARAMETER}=0`);
    permalinkManager['getPermalinkParamsFromUrl']();
    permalinkManager['setStateFromParams']();

    expect(permalinkManager.hasSearchVisible()).toEqual(true);
    expect(permalinkManager.getSearchVisible()).toEqual(false);
    expect(stateManager.state.interface.searchComponentVisible).toEqual(false);
  });
  it('should set visibility of search to true when parameter contains true', () => {
    mockLocation(`http://example.com?${SEARCH_VISIBLE_PARAMETER}=true`);
    permalinkManager['getPermalinkParamsFromUrl']();
    permalinkManager['setStateFromParams']();

    expect(permalinkManager.hasSearchVisible()).toEqual(true);
    expect(permalinkManager.getSearchVisible()).toEqual(true);
    expect(stateManager.state.interface.searchComponentVisible).toEqual(true);
  });

  it('should set visibility of basemap menu to true when parameter is missing', () => {
    mockLocation('http://example.com?');
    permalinkManager['getPermalinkParamsFromUrl']();
    permalinkManager['setStateFromParams']();

    expect(permalinkManager.hasBasemapVisible()).toEqual(false);
    expect(stateManager.state.interface.basemapComponentVisible).toEqual(true);
  });
  it('should set visibility of basemap menu to true when parameter contains no valid boolean', () => {
    mockLocation(`http://example.com?${BASEMAP_VISIBLE_PARAMETER}=falsch`);
    permalinkManager['getPermalinkParamsFromUrl']();
    permalinkManager['setStateFromParams']();

    expect(permalinkManager.hasBasemapVisible()).toEqual(true);
    expect(permalinkManager.getBasemapVisible()).toEqual(undefined);
    expect(stateManager.state.interface.basemapComponentVisible).toEqual(true);
  });
  it('should set visibility of basemap menu to false when parameter contains 0', () => {
    mockLocation(`http://example.com?${BASEMAP_VISIBLE_PARAMETER}=0`);
    permalinkManager['getPermalinkParamsFromUrl']();
    permalinkManager['setStateFromParams']();

    expect(permalinkManager.hasBasemapVisible()).toEqual(true);
    expect(permalinkManager.getBasemapVisible()).toEqual(false);
    expect(stateManager.state.interface.basemapComponentVisible).toEqual(false);
  });
  it('should set visibility of basemap menu to true when parameter contains true', () => {
    mockLocation(`http://example.com?${BASEMAP_VISIBLE_PARAMETER}=true`);
    permalinkManager['getPermalinkParamsFromUrl']();
    permalinkManager['setStateFromParams']();

    expect(permalinkManager.hasBasemapVisible()).toEqual(true);
    expect(permalinkManager.getBasemapVisible()).toEqual(true);
    expect(stateManager.state.interface.basemapComponentVisible).toEqual(true);
  });
});
