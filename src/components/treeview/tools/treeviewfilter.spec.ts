// SPDX-License-Identifier: Apache-2.0
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestOgcServer } from '../../../tools/tests/layerhelpers';
import GroupLayer from '../../../models/layers/grouplayer';
import LayerWms from '../../../models/layers/layerwms';
import TreeViewFilterHelper from './treeviewfilter';
import MockHelper from '../../../tools/tests/mockhelper';
import ServerOgc from '../../../models/serverogc';
import ThemeLayer from '../../../models/layers/themelayer';
import LayerManager from '../../../tools/layers/layermanager';
import IGirafeContext from '../../../tools/context/icontext';

describe('treeviewfilter.filterLayerTree', () => {
  let ogcServer: ServerOgc;
  let layerManager: LayerManager;
  let context: IGirafeContext;
  let treeviewFilterHelper: TreeViewFilterHelper;

  beforeEach(() => {
    ogcServer = createTestOgcServer();
  });

  beforeAll(() => {
    context = MockHelper.startMocking();
    layerManager = context.layerManager;
    treeviewFilterHelper = new TreeViewFilterHelper(context);
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  it('filters items correctly if the search term is at the beginning of the layer name', () => {
    const layer1 = new LayerWms(1, 'abcdef', 1, ogcServer);
    const layer2 = new LayerWms(2, 'abc def', 2, ogcServer);
    const layer3 = new LayerWms(3, 'abc-def', 3, ogcServer);
    const layerTree = [layer1, layer2, layer3];

    treeviewFilterHelper.filterLayerTree(layerTree, 'abc');

    const flatLayerTree = layerManager.getFlattenedLayerTree(layerTree);

    expect(flatLayerTree.every((l) => l.isVisible)).toBe(true);
  });

  it('filters items correctly if the search term is in the middle or at the end of the layer name', () => {
    const layer1 = new LayerWms(1, 'The abcdef', 1, ogcServer);
    const layer2 = new LayerWms(2, '1 abc def', 2, ogcServer);
    const layer3 = new LayerWms(3, ' abc-def', 3, ogcServer);
    const layer4 = new LayerWms(3, 'def abc', 3, ogcServer);
    const layerTree = [layer1, layer2, layer3, layer4];

    treeviewFilterHelper.filterLayerTree(layerTree, 'abc');

    const flatLayerTree = layerManager.getFlattenedLayerTree(layerTree);

    expect(flatLayerTree.every((l) => l.isVisible)).toBe(true);
  });

  it('filters items correctly if the search term contains a special character', () => {
    const layer1 = new LayerWms(1, 'The_abcdef', 1, ogcServer);
    const layer2 = new LayerWms(2, '1 abc def_', 2, ogcServer);
    const layer3 = new LayerWms(3, '_abc-def', 3, ogcServer);
    const layer4 = new LayerWms(3, 'def_abc', 3, ogcServer);
    const layerTree = [layer1, layer2, layer3, layer4];

    treeviewFilterHelper.filterLayerTree(layerTree, '_');

    const flatLayerTree = layerManager.getFlattenedLayerTree(layerTree);

    expect(flatLayerTree.every((l) => l.isVisible)).toBe(true);
  });

  it('filters items correctly if the search term contains a number', () => {
    const layer1 = new LayerWms(1, 'The_abcd42ef', 1, ogcServer);
    const layer2 = new LayerWms(2, '42 abc def_', 2, ogcServer);
    const layer3 = new LayerWms(3, '_abc42def', 3, ogcServer);
    const layerTree = [layer1, layer2, layer3];

    treeviewFilterHelper.filterLayerTree(layerTree, '42');

    const flatLayerTree = layerManager.getFlattenedLayerTree(layerTree);

    expect(flatLayerTree.every((l) => l.isVisible)).toBe(true);
  });

  it('produces reproducible filter results', () => {
    const group1 = new GroupLayer(1, 'Gewässer', 1);
    const group2 = new GroupLayer(2, 'Grundwassernutzung', 2);
    const layer21 = new LayerWms(21, 'Entnahmestellen', 21, ogcServer);
    const layer22 = new LayerWms(22, 'Rückgabestellen', 22, ogcServer);
    group2.children.push(...[layer21, layer22]);
    layer21.parent = layer22.parent = group2;
    group1.children.push(...[group2]);
    group2.parent = group1;
    const layerTree = [group1];

    treeviewFilterHelper.filterLayerTree(layerTree, 'ent');
    const flatLayerTree = layerManager.getFlattenedLayerTree(layerTree);

    expect(flatLayerTree.find((l) => l.name === 'Gewässer')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'Grundwassernutzung')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'Entnahmestellen')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'Rückgabestellen')?.isVisible).toBe(false);

    // Add a letter to the search term - every layer is filtered out
    treeviewFilterHelper.filterLayerTree(layerTree, 'entd');
    expect(flatLayerTree.every((l) => l.isVisible)).toBe(false);

    // Go back to search term from before and make sure it filters the same layers
    treeviewFilterHelper.filterLayerTree(layerTree, 'ent');
    expect(flatLayerTree.find((l) => l.name === 'Gewässer')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'Grundwassernutzung')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'Entnahmestellen')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'Rückgabestellen')?.isVisible).toBe(false);
  });

  it('filters simple tree view items', () => {
    const layer11 = new LayerWms(11, 'trees', 11, ogcServer);
    const layer12 = new LayerWms(12, 'houses', 12, ogcServer);
    const layerTree = [layer11, layer12];

    treeviewFilterHelper.filterLayerTree(layerTree, 'trees');

    const flatLayerTree = layerManager.getFlattenedLayerTree(layerTree);

    expect(flatLayerTree.find((l) => l.name === 'houses')?.isVisible).toBe(false);
    expect(flatLayerTree.find((l) => l.name === 'trees')?.isVisible).toBe(true);
  });

  it('filters simple tree view items and their parents', () => {
    const group1 = new GroupLayer(1, 'av', 1);
    const group2 = new GroupLayer(2, 'coverage', 2);
    const layer21 = new LayerWms(21, 'trees', 21, ogcServer);
    const layer22 = new LayerWms(22, 'houses', 22, ogcServer);
    group2.children.push(...[layer21, layer22]);
    layer21.parent = layer22.parent = group2;
    group1.children.push(...[group2]);
    group2.parent = group1;
    const layerTree = [group1];

    treeviewFilterHelper.filterLayerTree(layerTree, 'trees');

    const flatLayerTree = layerManager.getFlattenedLayerTree(layerTree);

    expect(flatLayerTree.find((l) => l.name === 'houses')?.isVisible).toBe(false);
    expect(flatLayerTree.find((l) => l.name === 'trees')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'coverage')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'av')?.isVisible).toBe(true);
  });

  it('filters group items, their children and their parents', () => {
    const group1 = new GroupLayer(1, 'av', 1);
    const group2 = new GroupLayer(2, 'coverage', 2);
    const layer21 = new LayerWms(21, 'trees', 21, ogcServer);
    const layer22 = new LayerWms(22, 'houses', 22, ogcServer);
    group2.children.push(...[layer21, layer22]);
    layer21.parent = layer22.parent = group2;
    group1.children.push(...[group2]);
    group2.parent = group1;
    const layerTree = [group1];

    treeviewFilterHelper.filterLayerTree(layerTree, 'coverage');

    const flatLayerTree = layerManager.getFlattenedLayerTree(layerTree);

    expect(flatLayerTree.find((l) => l.name === 'houses')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'trees')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'coverage')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'av')?.isVisible).toBe(true);
  });

  it('filters theme items and their children', () => {
    const theme1 = new ThemeLayer(1, 'map theme', 1);
    const group2 = new GroupLayer(2, 'av', 2);
    const group3 = new GroupLayer(3, 'coverage', 3);
    const layer31 = new LayerWms(31, 'trees', 31, ogcServer);
    const layer32 = new LayerWms(32, 'houses', 32, ogcServer);
    const layer4 = new LayerWms(4, 'other layer', 4, ogcServer);
    group3.children.push(...[layer31, layer32]);
    layer31.parent = layer32.parent = group3;
    group3.parent = group2;
    group2.children.push(...[group3]);
    group2.parent = theme1;
    theme1.children.push(...[group2]);
    const layerTree = [theme1, layer4];

    treeviewFilterHelper.filterLayerTree(layerTree, 'map');

    const flatLayerTree = layerManager.getFlattenedLayerTree(layerTree);

    expect(flatLayerTree.find((l) => l.name === 'houses')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'trees')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'coverage')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'av')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'map theme')?.isVisible).toBe(true);
    expect(flatLayerTree.find((l) => l.name === 'other layer')?.isVisible).toBe(false);
  });
});

describe('treeviewfilter.prepareTreeItemForSearch', () => {
  // Create layer tree
  const ogcServer = createTestOgcServer();
  const theme1 = new ThemeLayer(1, 'map theme', 1);
  const group2 = new GroupLayer(2, 'av', 2);
  const group3 = new GroupLayer(3, 'coverage', 3);
  const layer31 = new LayerWms(31, 'trees', 31, ogcServer);
  const layer32 = new LayerWms(32, 'houses', 32, ogcServer);
  const layer4 = new LayerWms(4, 'other layer', 4, ogcServer);
  group3.children.push(...[layer31, layer32]);
  layer31.parent = layer32.parent = group3;
  group3.parent = group2;
  group2.children.push(...[group3]);
  group2.parent = theme1;
  theme1.children.push(...[group2]);
  const layerTree = [theme1, layer4];
  let preparedLayers: { name: string; idList: string[] }[];
  let context: IGirafeContext;
  let treeviewFilterHelper: TreeViewFilterHelper;

  beforeAll(() => {
    context = MockHelper.startMocking();
    treeviewFilterHelper = new TreeViewFilterHelper(context);
    // @ts-ignore
    preparedLayers = layerTree.flatMap((layer) => treeviewFilterHelper.prepareTreeItemForSearch(layer));
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  it('collects item ids of parents', () => {
    const childItem = preparedLayers.find((l) => l.name === 'houses');
    expect(childItem?.idList).toContain(theme1.treeItemId);
    expect(childItem?.idList).toContain(group2.treeItemId);
    expect(childItem?.idList).toContain(group3.treeItemId);
    expect(childItem?.idList).not.toContain(layer4.treeItemId);
  });

  it('collects item ids of all children of the group', () => {
    const groupId = preparedLayers.find((l) => l.name === 'coverage');
    expect(groupId?.idList).toContain(layer31.treeItemId);
    expect(groupId?.idList).toContain(layer32.treeItemId);
    expect(groupId?.idList).not.toContain(layer4.treeItemId);
  });

  it('collects item ids of all children of the theme', () => {
    const themeId = preparedLayers.find((l) => l.name === 'map theme');
    expect(themeId?.idList).toContain(group2.treeItemId);
    expect(themeId?.idList).toContain(group3.treeItemId);
    expect(themeId?.idList).toContain(layer31.treeItemId);
    expect(themeId?.idList).toContain(layer32.treeItemId);
    expect(themeId?.idList).not.toContain(layer4.treeItemId);
  });
});
