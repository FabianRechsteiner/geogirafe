import { describe, it, expect, beforeAll } from 'vitest';
import MockHelper from '../../tools/tests/mockhelper';
import OfflineComponent from './component';
import { createTestBasemap, createTestLayerWmts } from '../../tools/tests/layerhelpers';
import BasemapEmpty from '../../models/basemaps/basemapempty';
import IGirafeContext from '../../tools/context/icontext';

describe('OfflineComponent.getAllWmtsLayers', () => {
  let element: OfflineComponent;
  let context: IGirafeContext;

  beforeAll(() => {
    context = MockHelper.startMocking();
    if (!customElements.get('girafe-offline')) {
      customElements.define('girafe-offline', OfflineComponent);
    }
    element = new OfflineComponent();
    // @ts-ignore
    element._context = context;
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
    // @ts-expect-error: private property
    element.state.activeBasemaps = [basemap];

    // @ts-ignore
    const result = element.getAllWmtsLayers();
    expect(result).toEqual([wmtsLayer1, wmtsLayer2]);
  });

  it('should return only layers if no basemap layers are available', () => {
    const wmtsLayer1 = createTestLayerWmts();
    const wmtsLayer2 = createTestLayerWmts();
    // @ts-expect-error: private property
    element.state.layers.layersList = [wmtsLayer1, wmtsLayer2];
    context.layerManager.toggleLayer(wmtsLayer1, 'on');
    context.layerManager.toggleLayer(wmtsLayer2, 'on');
    // @ts-expect-error: private property
    element.state.activeBasemaps = [new BasemapEmpty()];

    // @ts-ignore
    const result = element.getAllWmtsLayers();
    expect(result).toEqual([wmtsLayer1, wmtsLayer2]);
  });

  it('should return only active layers', () => {
    const wmtsLayer1 = createTestLayerWmts();
    const wmtsLayer2 = createTestLayerWmts();
    // @ts-expect-error: private property
    element.state.layers.layersList = [wmtsLayer1, wmtsLayer2];
    context.layerManager.toggleLayer(wmtsLayer1, 'on');
    context.layerManager.toggleLayer(wmtsLayer2, 'off');

    // @ts-ignore
    const result = element.getAllWmtsLayers();
    expect(result).toEqual([wmtsLayer1]);
  });

  it('should return both basemap and active layers', () => {
    const wmtsLayer1 = createTestLayerWmts();
    const wmtsLayer2 = createTestLayerWmts();
    const basemap = createTestBasemap();
    basemap.layersList = [wmtsLayer1, wmtsLayer2];
    // @ts-expect-error: private property
    element.state.activeBasemaps = [basemap];

    const wmtsLayer3 = createTestLayerWmts();
    const wmtsLayer4 = createTestLayerWmts();
    // @ts-expect-error: private property
    element.state.layers.layersList = [wmtsLayer3, wmtsLayer4];
    context.layerManager.toggleLayer(wmtsLayer3, 'on');
    context.layerManager.toggleLayer(wmtsLayer4, 'off');

    // @ts-ignore
    const result = element.getAllWmtsLayers();
    expect(result).toEqual([wmtsLayer1, wmtsLayer2, wmtsLayer3]);
  });
});
