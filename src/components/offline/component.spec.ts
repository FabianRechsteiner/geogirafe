import { describe, it, expect, beforeAll } from 'vitest';
import MockHelper from '../../tools/tests/mockhelper';
import OfflineComponent from './component';
import { createTestBasemap, createTestLayerWmts } from '../../tools/tests/layerhelpers';
import LayerManager from '../../tools/layers/layermanager';

describe('OfflineComponent.getAllWmtsLayers', () => {
  let element: OfflineComponent;

  beforeAll(() => {
    MockHelper.startMocking();
    if (!customElements.get('girafe-offline')) {
      customElements.define('girafe-offline', OfflineComponent);
    }
    element = new OfflineComponent();
  });

  it('should return empty array if no layers are available and', () => {
    // @ts-ignore
    const result = element.getAllWmtsLayers();
    expect(result).toEqual([]);
  });

  it('should return only basemap layers if no active layers are available', () => {
    const wmtsLayer1 = createTestLayerWmts();
    const wmtsLayer2 = createTestLayerWmts();
    const basemap = createTestBasemap();
    basemap.layersList = [wmtsLayer1, wmtsLayer2];
    element.state.activeBasemap = basemap;

    // @ts-ignore
    const result = element.getAllWmtsLayers();
    expect(result).toEqual([wmtsLayer1, wmtsLayer2]);
  });

  it('should return only layers if no basemap layers are available', () => {
    const wmtsLayer1 = createTestLayerWmts();
    const wmtsLayer2 = createTestLayerWmts();
    element.state.layers.layersList = [wmtsLayer1, wmtsLayer2];
    LayerManager.getInstance().toggleLayer(wmtsLayer1, 'on');
    LayerManager.getInstance().toggleLayer(wmtsLayer2, 'on');
    element.state.activeBasemap = null;

    // @ts-ignore
    const result = element.getAllWmtsLayers();
    expect(result).toEqual([wmtsLayer1, wmtsLayer2]);
  });

  it('should return only active layers', () => {
    const wmtsLayer1 = createTestLayerWmts();
    const wmtsLayer2 = createTestLayerWmts();
    element.state.layers.layersList = [wmtsLayer1, wmtsLayer2];
    LayerManager.getInstance().toggleLayer(wmtsLayer1, 'on');
    LayerManager.getInstance().toggleLayer(wmtsLayer2, 'off');

    // @ts-ignore
    const result = element.getAllWmtsLayers();
    expect(result).toEqual([wmtsLayer1]);
  });

  it('should return both basemap and active layers', () => {
    const wmtsLayer1 = createTestLayerWmts();
    const wmtsLayer2 = createTestLayerWmts();
    const basemap = createTestBasemap();
    basemap.layersList = [wmtsLayer1, wmtsLayer2];
    element.state.activeBasemap = basemap;

    const wmtsLayer3 = createTestLayerWmts();
    const wmtsLayer4 = createTestLayerWmts();
    element.state.layers.layersList = [wmtsLayer3, wmtsLayer4];
    LayerManager.getInstance().toggleLayer(wmtsLayer3, 'on');
    LayerManager.getInstance().toggleLayer(wmtsLayer4, 'off');

    // @ts-ignore
    const result = element.getAllWmtsLayers();
    expect(result).toEqual([wmtsLayer1, wmtsLayer2, wmtsLayer3]);
  });
});
