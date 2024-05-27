import type LayerWms from '../../../models/layers/layerwms';
import type LayerWmts from '../../../models/layers/layerwmts';
import { describe, it, expect } from 'vitest';
import { isLayerVisible } from './printUtils';
import { createTestLayerWms, createTestLayerWmts } from '../../../tools/tests/layerhelpers';

describe('isLayerVisible tests', () => {
  it('should test layer visibility based on opacity', () => {
    const layer: LayerWms = createTestLayerWms();
    expect(isLayerVisible(layer)).toBe(true);
    layer.opacity = 0.5;
    expect(isLayerVisible(layer)).toBe(true);
    layer.opacity = 0;
    expect(isLayerVisible(layer)).toBe(false);
  });

  it('should test layer visibility based on resolution', () => {
    const layer: LayerWmts = createTestLayerWmts();
    expect(isLayerVisible(layer)).toBe(true);
    expect(isLayerVisible(layer, 200)).toBe(true);
    expect(isLayerVisible(layer, 125)).toBe(true);
    expect(isLayerVisible(layer, 50)).toBe(true);
    layer.minResolution = 100;
    layer.maxResolution = 150;
    expect(isLayerVisible(layer)).toBe(true);
    expect(isLayerVisible(layer, 200)).toBe(false);
    expect(isLayerVisible(layer, 125)).toBe(true);
    expect(isLayerVisible(layer, 50)).toBe(false);
  });
});
