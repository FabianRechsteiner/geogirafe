import { it, expect, describe, beforeAll, afterAll, vi } from 'vitest';
import ThemesManager from './themesmanager';
import MockHelper from '../tests/mockhelper';
import { GMFServerOgc } from '../../models/gmf';
import IGirafeContext from '../context/icontext';

let manager: ThemesManager;
let context: IGirafeContext;

const fetchMock = vi.fn();
const emptyTheme = {
  background_layers: [],
  ogcServers: {},
  themes: []
};

beforeAll(async () => {
  context = MockHelper.startMocking();
  global.fetch = fetchMock;
  fetchMock.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(emptyTheme) });
  manager = context.themesManager;
  // @ts-ignore
  await manager.initialize();
});

afterAll(() => {
  MockHelper.stopMocking(context);
});

describe('ThemesManager.prepareOgcServers', () => {
  it('should return an empty object when given an empty input', () => {
    const result = manager.prepareOgcServers({});
    expect(result).toEqual({});
  });

  it('should correctly prepare servers from the input JSON', () => {
    const input: Record<string, GMFServerOgc> = {
      'WMS 1': {
        url: 'https://wms-1.test.url',
        wfsSupport: true,
        urlWfs: 'https://wfs-1.url',
        type: 'mapserver',
        imageType: 'image/png'
      },
      'WMS 2': {
        url: 'https://wms-2.test.url',
        wfsSupport: false,
        type: 'qgisserver',
        imageType: 'image/png'
      }
    };

    // Ignore WFS Preload
    vi.spyOn(context.themesManager, 'preloadWfsServer').mockResolvedValue();
    const result = manager.prepareOgcServers(input);

    const server1 = result['WMS 1'];
    expect(server1.name).toEqual('WMS 1');
    expect(server1.url).toEqual(input['WMS 1'].url);
    expect(server1.wfsSupport).toEqual(input['WMS 1'].wfsSupport);
    expect(server1.urlWfs).toEqual(input['WMS 1'].urlWfs);
    expect(server1.type).toEqual(input['WMS 1'].type);
    expect(server1.imageType).toEqual(input['WMS 1'].imageType);

    const server2 = result['WMS 2'];
    expect(server2.name).toEqual('WMS 2');
    expect(server2.url).toEqual(input['WMS 2'].url);
    expect(server2.wfsSupport).toEqual(input['WMS 2'].wfsSupport);
    expect(server2.urlWfs).toBeUndefined();
    expect(server2.type).toEqual(input['WMS 2'].type);
    expect(server2.imageType).toEqual(input['WMS 2'].imageType);
  });
});
