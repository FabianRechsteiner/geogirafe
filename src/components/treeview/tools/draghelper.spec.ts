import { describe, test, expect } from 'vitest';
import GroupLayer from '../../../models/layers/grouplayer';
import LayerWms from '../../../models/layers/layerwms';
import { createTestOgcServer } from '../../../tools/tests/layerhelpers';
import DragHelper from './draghelper';

describe('DragManager', () => {
  const ogcServer = createTestOgcServer();

  test('MoveLayerAfter, only layers, very simple case', async () => {
    const group1 = new GroupLayer(1, 'group1', 1);
    const layer11 = new LayerWms(11, 'layer11', 11, ogcServer);
    const layer12 = new LayerWms(12, 'layer12', 12, ogcServer);
    group1.children.push(...[layer11, layer12]);
    layer11.parent = layer12.parent = group1;

    DragHelper.moveLayerAfter(layer11, layer12);

    expect(group1.order).toBe(1);
    expect(layer11.order).toBe(12);
    expect(layer12.order).toBe(11);
  });

  test('MoveLayerAfter, only layers, top to middle', async () => {
    const group1 = new GroupLayer(1, 'group1', 1);
    const layer11 = new LayerWms(11, 'layer11', 11, ogcServer);
    const layer12 = new LayerWms(12, 'layer12', 12, ogcServer);
    const layer13 = new LayerWms(12, 'layer13', 13, ogcServer);
    const layer14 = new LayerWms(12, 'layer14', 14, ogcServer);
    const layer15 = new LayerWms(12, 'layer15', 15, ogcServer);
    group1.children.push(...[layer11, layer12, layer13, layer14, layer15]);
    layer11.parent = layer12.parent = layer13.parent = layer14.parent = layer15.parent = group1;

    DragHelper.moveLayerAfter(layer11, layer13);

    expect(group1.order).toBe(1);
    expect(layer12.order).toBe(11);
    expect(layer13.order).toBe(12);
    expect(layer11.order).toBe(13);
    expect(layer14.order).toBe(14);
    expect(layer15.order).toBe(15);
  });

  test('MoveLayerAfter, only layers, top to end', async () => {
    const group1 = new GroupLayer(1, 'group1', 1);
    const layer11 = new LayerWms(11, 'layer11', 11, ogcServer);
    const layer12 = new LayerWms(12, 'layer12', 12, ogcServer);
    const layer13 = new LayerWms(12, 'layer13', 13, ogcServer);
    const layer14 = new LayerWms(12, 'layer14', 14, ogcServer);
    const layer15 = new LayerWms(12, 'layer15', 15, ogcServer);
    group1.children.push(...[layer11, layer12, layer13, layer14, layer15]);
    layer11.parent = layer12.parent = layer13.parent = layer14.parent = layer15.parent = group1;

    DragHelper.moveLayerAfter(layer11, layer15);

    expect(group1.order).toBe(1);
    expect(layer12.order).toBe(11);
    expect(layer13.order).toBe(12);
    expect(layer14.order).toBe(13);
    expect(layer15.order).toBe(14);
    expect(layer11.order).toBe(15);
  });

  test('MoveLayerAfter, only layers, middle to end', async () => {
    const group1 = new GroupLayer(1, 'group1', 1);
    const layer11 = new LayerWms(11, 'layer11', 11, ogcServer);
    const layer12 = new LayerWms(12, 'layer12', 12, ogcServer);
    const layer13 = new LayerWms(12, 'layer13', 13, ogcServer);
    const layer14 = new LayerWms(12, 'layer14', 14, ogcServer);
    const layer15 = new LayerWms(12, 'layer15', 15, ogcServer);
    group1.children.push(...[layer11, layer12, layer13, layer14, layer15]);
    layer11.parent = layer12.parent = layer13.parent = layer14.parent = layer15.parent = group1;

    DragHelper.moveLayerAfter(layer13, layer15);

    expect(group1.order).toBe(1);
    expect(layer11.order).toBe(11);
    expect(layer12.order).toBe(12);
    expect(layer14.order).toBe(13);
    expect(layer15.order).toBe(14);
    expect(layer13.order).toBe(15);
  });

  test('MoveLayerBefore, only layers, very simple case', async () => {
    const group1 = new GroupLayer(1, 'group1', 1);
    const layer11 = new LayerWms(11, 'layer11', 11, ogcServer);
    const layer12 = new LayerWms(12, 'layer12', 12, ogcServer);
    group1.children.push(...[layer11, layer12]);
    layer11.parent = layer12.parent = group1;

    DragHelper.moveLayerBefore(layer12, layer11);

    expect(group1.order).toBe(1);
    expect(layer11.order).toBe(12);
    expect(layer12.order).toBe(11);
  });

  test('MoveLayerBefore, only layers, middle to top', async () => {
    const group1 = new GroupLayer(1, 'group1', 1);
    const layer11 = new LayerWms(11, 'layer11', 11, ogcServer);
    const layer12 = new LayerWms(12, 'layer12', 12, ogcServer);
    const layer13 = new LayerWms(12, 'layer13', 13, ogcServer);
    const layer14 = new LayerWms(12, 'layer14', 14, ogcServer);
    const layer15 = new LayerWms(12, 'layer15', 15, ogcServer);
    group1.children.push(...[layer11, layer12, layer13, layer14, layer15]);
    layer11.parent = layer12.parent = layer13.parent = layer14.parent = layer15.parent = group1;

    DragHelper.moveLayerBefore(layer13, layer11);

    expect(group1.order).toBe(1);
    expect(layer13.order).toBe(11);
    expect(layer11.order).toBe(12);
    expect(layer12.order).toBe(13);
    expect(layer14.order).toBe(14);
    expect(layer15.order).toBe(15);
  });

  test('MoveLayerBefore, only layers, end to top', async () => {
    const group1 = new GroupLayer(1, 'group1', 1);
    const layer11 = new LayerWms(11, 'layer11', 11, ogcServer);
    const layer12 = new LayerWms(12, 'layer12', 12, ogcServer);
    const layer13 = new LayerWms(12, 'layer13', 13, ogcServer);
    const layer14 = new LayerWms(12, 'layer14', 14, ogcServer);
    const layer15 = new LayerWms(12, 'layer15', 15, ogcServer);
    group1.children.push(...[layer11, layer12, layer13, layer14, layer15]);
    layer11.parent = layer12.parent = layer13.parent = layer14.parent = layer15.parent = group1;

    DragHelper.moveLayerBefore(layer15, layer11);

    expect(group1.order).toBe(1);
    expect(layer15.order).toBe(11);
    expect(layer11.order).toBe(12);
    expect(layer12.order).toBe(13);
    expect(layer13.order).toBe(14);
    expect(layer14.order).toBe(15);
  });

  test('MoveLayerBefore, only layers, end to middle', async () => {
    const group1 = new GroupLayer(1, 'group1', 1);
    const layer11 = new LayerWms(11, 'layer11', 11, ogcServer);
    const layer12 = new LayerWms(12, 'layer12', 12, ogcServer);
    const layer13 = new LayerWms(12, 'layer13', 13, ogcServer);
    const layer14 = new LayerWms(12, 'layer14', 14, ogcServer);
    const layer15 = new LayerWms(12, 'layer15', 15, ogcServer);
    group1.children.push(...[layer11, layer12, layer13, layer14, layer15]);
    layer11.parent = layer12.parent = layer13.parent = layer14.parent = layer15.parent = group1;

    DragHelper.moveLayerBefore(layer15, layer13);

    expect(group1.order).toBe(1);
    expect(layer11.order).toBe(11);
    expect(layer12.order).toBe(12);
    expect(layer15.order).toBe(13);
    expect(layer13.order).toBe(14);
    expect(layer14.order).toBe(15);
  });
});
