// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, vi } from 'vitest';
import OfflineManager from './offlinemanager';
import { Extent } from 'ol/extent';
import LayerWmts from '../../models/layers/layerwmts';
import { createTestLayerWmts } from '../tests/layerhelpers';
import MockHelper from '../tests/mockhelper';
import { createOlWmtsLayer } from '../tests/olhelpers';
import IGirafeContext from '../context/icontext';

vi.mock('./download', () => ({
  download: vi.fn()
}));

describe('OfflineManager', () => {
  let offlineManager: OfflineManager;
  let context: IGirafeContext;

  beforeEach(() => {
    context = MockHelper.startMocking();
    offlineManager = context.offlineManager;
  });

  describe('OfflineManager.getAllTileUrls', () => {
    it('should return empty array if wmtsLayers is empty', () => {
      const bbox: Extent = [0, 0, 0, 0];
      const wmtsLayers: LayerWmts[] = [];
      // @ts-ignore
      const result = offlineManager.getAllTileUrls(bbox, wmtsLayers);
      expect(result).toEqual([]);
    });

    it('should return empty array if wmtsLayers has no valid source', () => {
      const bbox: Extent = [0, 0, 0, 0];
      const wmtsLayers: LayerWmts[] = [createTestLayerWmts()];
      // @ts-ignore
      const result = offlineManager.getAllTileUrls(bbox, wmtsLayers);
      expect(result).toEqual([]);
    });

    it('should return the correct number of tiles with valid URLs', () => {
      const wmtsLayer = createTestLayerWmts();
      wmtsLayer._olayer = createOlWmtsLayer();
      const bbox: Extent = [0, 0, 100, 100];
      // @ts-ignore
      const result = offlineManager.getAllTileUrls(bbox, [wmtsLayer]);

      expect(result.length).toEqual(10);
      const r = result[0];
      // @ts-ignore
      expect(r).toContain(wmtsLayer._olayer.getSource()!.urls[0]);
      // @ts-ignore
      expect(r).toContain(encodeURIComponent(wmtsLayer._olayer.getSource()!.format_));
    });

    it('should handle multiple wmtsLayers and accumulate tile URLs', () => {
      const wmtsLayer1 = createTestLayerWmts();
      wmtsLayer1._olayer = createOlWmtsLayer();
      const wmtsLayer2 = createTestLayerWmts();
      wmtsLayer2._olayer = createOlWmtsLayer('https://wmts.bs.ch/');

      const bbox: Extent = [-100, -100, 100, 100];
      // @ts-ignore
      const result = offlineManager.getAllTileUrls(bbox, [wmtsLayer1, wmtsLayer2]);
      expect(result.length).toEqual(80);
      let r = result[0];
      // @ts-ignore
      expect(r).toContain(wmtsLayer1._olayer.getSource()!.urls[0]);
      // @ts-ignore
      expect(r).toContain(encodeURIComponent(wmtsLayer1._olayer.getSource()!.format_));
      r = result[result.length - 1];
      // @ts-ignore
      expect(r).toContain(wmtsLayer2._olayer.getSource()!.urls[0]);
      // @ts-ignore
      expect(r).toContain(encodeURIComponent(wmtsLayer2._olayer.getSource()!.format_));
    });
  });
});
