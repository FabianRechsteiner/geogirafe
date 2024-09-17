import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createTestOgcServer } from '../tests/layerhelpers';
import GroupLayer from '../../models/layers/grouplayer';
import LayerWms from '../../models/layers/layerwms';
import OrderingManager from './orderingmanager';
import MockHelper from '../tests/mockhelper';

let orderingManager: OrderingManager;

beforeAll(() => {
  MockHelper.startMocking();
  orderingManager = OrderingManager.getInstance();
});

afterAll(() => {
  MockHelper.stopMocking();
});

describe('OrderingManager', () => {
  const ogcServer = createTestOgcServer();

  test('ReorderLayers, one group only, all layers are already in the right order', async () => {
    const group1 = new GroupLayer(1, 'group1', 1);
    const layer11 = new LayerWms(11, 'layer11', 11, ogcServer);
    const layer12 = new LayerWms(12, 'layer12', 12, ogcServer);
    group1.children.push(...[layer11, layer12]);
    layer11.parent = layer12.parent = group1;

    const counter = { index: 1000 };
    // @ts-ignore
    const orderedLayers = orderingManager.getSortedLayers([group1]);
    // @ts-ignore
    orderingManager.reorderLayersRecursively(orderedLayers, counter);

    expect(group1.order).toBe(1000);
    expect(layer11.order).toBe(1001);
    expect(layer12.order).toBe(1002);
  });

  test('ReorderLayers, one group only, invert layers', async () => {
    const group1 = new GroupLayer(1, 'group1', 1);
    const layer11 = new LayerWms(11, 'layer11', 12, ogcServer);
    const layer12 = new LayerWms(12, 'layer12', 11, ogcServer);
    group1.children.push(...[layer11, layer12]);
    layer11.parent = layer12.parent = group1;

    const counter = { index: 1000 };
    // @ts-ignore
    const orderedLayers = orderingManager.getSortedLayers([group1]);
    // @ts-ignore
    orderingManager.reorderLayersRecursively(orderedLayers, counter);

    expect(group1.order).toBe(1000);
    expect(layer12.order).toBe(1001);
    expect(layer11.order).toBe(1002);
  });

  test('ReorderLayers, one group only, multiple layers', async () => {
    const group1 = new GroupLayer(1, 'group1', 13215);
    const layer11 = new LayerWms(11, 'layer11', 1110, ogcServer);
    const layer12 = new LayerWms(12, 'layer12', 152, ogcServer);
    const layer13 = new LayerWms(12, 'layer13', 13, ogcServer);
    const layer14 = new LayerWms(12, 'layer14', 250, ogcServer);
    const layer15 = new LayerWms(12, 'layer15', 132, ogcServer);
    group1.children.push(...[layer11, layer12, layer13, layer14, layer15]);
    layer11.parent = layer12.parent = layer13.parent = layer14.parent = layer15.parent = group1;

    const counter = { index: 1000 };
    // @ts-ignore
    const orderedLayers = orderingManager.getSortedLayers([group1]);
    // @ts-ignore
    orderingManager.reorderLayersRecursively(orderedLayers, counter);

    expect(group1.order).toBe(1000);
    expect(layer13.order).toBe(1001);
    expect(layer15.order).toBe(1002);
    expect(layer12.order).toBe(1003);
    expect(layer14.order).toBe(1004);
    expect(layer11.order).toBe(1005);
  });

  test('ReorderLayers, multiple groups, multiple layers', async () => {
    const group1 = new GroupLayer(1, 'group1', 13215);
    const layer11 = new LayerWms(11, 'layer11', 1110, ogcServer);
    const layer12 = new LayerWms(12, 'layer12', 152, ogcServer);
    const layer13 = new LayerWms(12, 'layer13', 13, ogcServer);
    const layer14 = new LayerWms(12, 'layer14', 250, ogcServer);
    const layer15 = new LayerWms(12, 'layer15', 132, ogcServer);
    group1.children.push(...[layer11, layer12, layer13, layer14, layer15]);
    layer11.parent = layer12.parent = layer13.parent = layer14.parent = layer15.parent = group1;

    const group2 = new GroupLayer(1, 'group2', 23);
    const layer21 = new LayerWms(11, 'layer11', 78, ogcServer);
    const layer22 = new LayerWms(12, 'layer12', 14552, ogcServer);
    const layer23 = new LayerWms(12, 'layer13', 113, ogcServer);
    group2.children.push(...[layer21, layer22, layer23]);
    layer21.parent = layer22.parent = layer23.parent = group2;

    const counter = { index: 1000 };
    // @ts-ignore
    const orderedLayers = orderingManager.getSortedLayers([group1, group2]);
    // @ts-ignore
    orderingManager.reorderLayersRecursively(orderedLayers, counter);

    expect(group2.order).toBe(1000);
    expect(layer21.order).toBe(1001);
    expect(layer23.order).toBe(1002);
    expect(layer22.order).toBe(1003);

    expect(group1.order).toBe(1004);
    expect(layer13.order).toBe(1005);
    expect(layer15.order).toBe(1006);
    expect(layer12.order).toBe(1007);
    expect(layer14.order).toBe(1008);
    expect(layer11.order).toBe(1009);
  });

  test('ReorderLayers, one group with subgroups', async () => {
    const group1 = new GroupLayer(1, 'group1', 13215);
    const layer11 = new LayerWms(11, 'layer11', 1110, ogcServer);
    const group12 = new GroupLayer(12, 'group12', 115);
    const layer121 = new LayerWms(121, 'layer121', 30, ogcServer);
    const layer122 = new LayerWms(122, 'layer122', 129, ogcServer);
    const group123 = new GroupLayer(123, 'group123', 115);
    const layer1231 = new LayerWms(1231, 'layer1231', 130, ogcServer);
    const layer1232 = new LayerWms(1232, 'layer1232', 129, ogcServer);

    group1.children.push(...[layer11, group12]);
    layer11.parent = group12.parent = group1;

    group12.children.push(...[layer121, layer122, group123]);
    layer121.parent = layer122.parent = group123.parent = group12;

    group123.children.push(...[layer1231, layer1232]);
    layer1231.parent = layer1232.parent = group123;

    const counter = { index: 1000 };
    // @ts-ignore
    const orderedLayers = orderingManager.getSortedLayers([group1]);
    // @ts-ignore
    orderingManager.reorderLayersRecursively(orderedLayers, counter);

    expect(group1.order).toBe(1000);
    expect(group12.order).toBe(1001);
    expect(layer121.order).toBe(1002);
    expect(group123.order).toBe(1003);
    expect(layer1232.order).toBe(1004);
    expect(layer1231.order).toBe(1005);
    expect(layer122.order).toBe(1006);
    expect(layer11.order).toBe(1007);
  });
});
