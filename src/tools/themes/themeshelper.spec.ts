import { it, expect, describe, beforeAll, afterAll, beforeEach } from 'vitest';
import MockHelper from '../tests/mockhelper';
import ThemesHelper from './themeshelper';
import { createTestGroupLayer, createTestLayerWms, createTestLayerWmts } from '../tests/layerhelpers';
import WfsFilter from '../wfs/wfsfilter';
import GroupLayer from '../../models/layers/grouplayer';
import Layer from '../../models/layers/layer';
import StateManager from '../state/statemanager';
import ThemeLayer from '../../models/layers/themelayer';

beforeAll(() => {
  MockHelper.startMocking();
});

afterAll(() => {
  MockHelper.stopMocking();
});

describe('ThemesHelper.extractLayerOptions for layer (not timeaware, not filtrable)', () => {
  let themesHelper: ThemesHelper;

  beforeEach(() => {
    themesHelper = ThemesHelper.getInstance();
    themesHelper.findLayerByName = (_name: string) => {
      return createTestLayerWmts();
    };
  });

  it('extractLayerOptions: check basic extraction', () => {
    // @ts-ignore
    const result = themesHelper.extractLayerOptions('layerName', 'layer');
    expect(result?.originalLayer).toBeInstanceOf(Layer);
    expect(result?.active).toBeTruthy();
    expect(result?.opacity).toBeUndefined();
    expect(result?.filter).toBeUndefined();
    expect(result?.timeRestriction).toBeUndefined();
  });

  it('extractLayerOptions: check opacity extraction', () => {
    // @ts-ignore
    const result = themesHelper.extractLayerOptions('layerName|o;0.5', 'layer');
    expect(result?.opacity).toBe(0.5);
  });

  it('extractLayerOptions: check filter extraction', () => {
    // @ts-ignore
    const result = themesHelper.extractLayerOptions('layerName|f;property;eq;value', 'layer');
    expect(result?.filter).toBeUndefined();
  });

  it('extractLayerOptions: check time restriction extraction', () => {
    // @ts-ignore
    const result = themesHelper.extractLayerOptions('layerName|t;2023-01-01', 'layer');
    expect(result?.timeRestriction).toBeUndefined();
  });

  it('extractLayerOptions: check inactive layer', () => {
    // @ts-ignore
    const result = themesHelper.extractLayerOptions('!layerName', 'layer');
    expect(result?.active).toBeFalsy();
  });

  it('extractLayerOptions: check multiple options extraction', () => {
    // @ts-ignore
    const result = themesHelper.extractLayerOptions('layerName|o;0.5|f;property;neq;value|t;2023-01-01', 'layer');
    expect(result?.opacity).toBe(0.5);
    expect(result?.filter).toBeUndefined();
    expect(result?.timeRestriction).toBeUndefined();
  });
});

describe('ThemesHelper.extractLayerOptions for layer (filtrable)', () => {
  let themesHelper: ThemesHelper;

  beforeEach(() => {
    themesHelper = ThemesHelper.getInstance();
    themesHelper.findLayerByName = (_name: string) => {
      return createTestLayerWms();
    };
  });

  it('extractLayerOptions: check filter extraction', () => {
    // @ts-ignore
    const result = themesHelper.extractLayerOptions('layerName|f;property;eq;value', 'layer');
    expect(result?.filter).toBeInstanceOf(WfsFilter);
    expect(result?.filter?.property).toEqual('property');
    expect(result?.filter?.operator).toEqual('eq');
    expect(result?.filter?.value).toEqual('value');
    expect(result?.filter?.propertyType).toEqual('string');
  });

  it('extractLayerOptions: check filter extraction', () => {
    // @ts-ignore
    const result = themesHelper.extractLayerOptions('layerName|f;property;eq;0;int', 'layer');
    expect(result?.filter).toBeInstanceOf(WfsFilter);
    expect(result?.filter?.property).toEqual('property');
    expect(result?.filter?.operator).toEqual('eq');
    expect(result?.filter?.value).toEqual('0');
    expect(result?.filter?.propertyType).toEqual('int');
  });

  it('extractLayerOptions: check filter extraction (wrong operator)', () => {
    // @ts-ignore
    const result = themesHelper.extractLayerOptions('layerName|f;property;wrong;value', 'layer');
    expect(result?.filter).toBeUndefined();
  });
});

describe('ThemesHelper.extractLayerOptions for layer (timeaware)', () => {
  let themesHelper: ThemesHelper;

  beforeEach(() => {
    themesHelper = ThemesHelper.getInstance();
    themesHelper.findLayerByName = (_name: string) => {
      const wmsLayer = createTestLayerWms();
      wmsLayer.timeOptions = {
        minValue: '2000',
        maxValue: '2020',
        minDefValue: null,
        maxDefValue: null,
        interval: [0, 0, 0, 0],
        resolution: 'year',
        mode: 'value',
        widget: 'datepicker'
      };
      return wmsLayer;
    };
  });

  it('extractLayerOptions: check time restriction extraction', () => {
    // @ts-ignore
    const result = themesHelper.extractLayerOptions('layerName|t;2023-01-01', 'layer');
    expect(result?.timeRestriction).toBe('2023-01-01');
  });

  it('extractLayerOptions: check multiple options extraction', () => {
    // @ts-ignore
    const result = themesHelper.extractLayerOptions('layerName|o;0.5|f;property;neq;value|t;2023-01-01', 'layer');
    expect(result?.opacity).toBe(0.5);
    expect(result?.filter).toBeInstanceOf(WfsFilter);
    expect(result?.timeRestriction).toEqual('2023-01-01');
  });

  it('extractLayerOptions: time with /', () => {
    // @ts-ignore
    const result = themesHelper.extractLayerOptions('layerName|t;1995/2001', 'layer');
    expect(result?.opacity).toBeUndefined();
    expect(result?.filter).toBeUndefined();
    expect(result?.timeRestriction).toBe('1995/2001');
  });
});

describe('ThemesHelper.extractLayerOptions for group', () => {
  let themesHelper: ThemesHelper;
  beforeEach(() => {
    themesHelper = ThemesHelper.getInstance();
    themesHelper.findGroupByName = (_name: string) => {
      return createTestGroupLayer();
    };
  });

  it('extractLayerOptions: check group extraction', () => {
    // @ts-ignore
    const result = themesHelper.extractLayerOptions('groupName', 'group');
    expect(result?.originalLayer).toBeInstanceOf(GroupLayer);
  });
});

describe('ThemesHelper.getInitialOrderForNewTheme', () => {
  let themesHelper: ThemesHelper;
  let stateManager: StateManager;

  beforeEach(() => {
    themesHelper = ThemesHelper.getInstance();
    stateManager = StateManager.getInstance();
  });

  it('returns an order value of 0 if there are no pinned themes present', () => {
    const theme1 = new ThemeLayer(0, 'theme 1', 101);
    const theme2 = new ThemeLayer(0, 'theme 2', 102);
    const theme3 = new ThemeLayer(0, 'theme 3', 103);

    stateManager.state.layers.layersList = [theme1, theme2, theme3];

    expect(themesHelper.getInitialOrderForNewTheme()).toEqual(0);
  });

  it('returns the order value of the pinned theme with the highest order', () => {
    const theme1 = new ThemeLayer(0, 'theme 1', 101);
    const theme2 = new ThemeLayer(0, 'theme 2', 102);
    const theme3 = new ThemeLayer(0, 'theme 3', 103);

    stateManager.state.layers.layersList = [theme1, theme2, theme3];

    theme2.isPinned = true;
    expect(themesHelper.getInitialOrderForNewTheme()).toEqual(102);

    theme3.isPinned = true;
    expect(themesHelper.getInitialOrderForNewTheme()).toEqual(103);
  });
});
