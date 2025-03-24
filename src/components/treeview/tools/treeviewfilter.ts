import BaseLayer from '../../../models/layers/baselayer';
import ThemeLayer from '../../../models/layers/themelayer';
import GroupLayer from '../../../models/layers/grouplayer';
import I18nManager from '../../../tools/i18n/i18nmanager';
import LayerManager from '../../../tools/layers/layermanager';

/**
 * Filters a tree structure of layers based on a search query.
 * Updates the visibility of layers matching the search text.
 *
 * @param {BaseLayer[]} layerTree - The tree structure of layers to filter.
 * @param {string} searchText - The text query used to filter the layers.
 */
export const filterLayerTree = (layerTree: BaseLayer[], searchText: string) => {
  const query = searchText.trim().toLowerCase();

  // Prepare layers for filtering
  const preparedLayers: { idList: string[]; name: string }[] = layerTree.flatMap((layer) =>
    prepareTreeItemForSearch(layer)
  );

  // Filter the prepared tree items based on the query
  const filteredTree = preparedLayers.filter((l) => l.name.includes(query));

  // Remove duplicate ids in filter result
  const matchingLayerIds = Array.from(new Set(filteredTree.map((l) => l.idList).flat()));

  // Update visibility of layers based on matching IDs
  toggleLayerVisibility(layerTree, matchingLayerIds);
};

/**
 * Toggles visibility of layers whose IDs match the provided list.
 *
 * @param {BaseLayer[]} layerTree - The tree structure of layers.
 * @param {string[]} matchingIds - Array of IDs whose visibility should be toggled.
 */
const toggleLayerVisibility = (layerTree: BaseLayer[], matchingIds: string[]) => {
  const allLayers = LayerManager.getInstance().getFlattenedLayerTree(layerTree);
  allLayers.forEach((layer) => {
    const newVisibility = matchingIds.includes(layer.treeItemId);
    if (layer.isVisible !== newVisibility) {
      layer.isVisible = newVisibility;
    }
  });
};

/**
 * Prepares a list of layer tree items for search by processing them hierarchically.
 *
 * @param {BaseLayer} layer - The layer to process.
 * @param {string[]} [parentIds=[]] - An array of parent IDs representing the hierarchy above the current layer.
 * @returns {{ idList: string[]; name: string }[]} An array of objects where each object contains:
 *  - `idList`: A combined array of parent IDs, the layer's own ID, and all of its children IDs.
 *  - `name`: The localized and lowercased name of the layer.
 */
export const prepareTreeItemForSearch = (
  layer: BaseLayer,
  parentIds: string[] = []
): {
  idList: string[];
  name: string;
}[] => {
  // Translate layer name
  const name = I18nManager.getInstance().getTranslation(layer.name).toLowerCase();
  // Recursively travel trough tree
  if (layer instanceof ThemeLayer || layer instanceof GroupLayer) {
    return [
      {
        idList: [...parentIds, ...getChildIdsRecursively(layer)],
        name: name
      },
      // Process children
      ...layer.children.flatMap((child) => prepareTreeItemForSearch(child, [...parentIds, layer.treeItemId]))
    ];
  }
  return [{ idList: [layer.treeItemId, ...parentIds], name: name }];
};

/**
 * Retrieves the tree item IDs of the given layer and all its child layers recursively.
 *
 * @param {BaseLayer} layer - The root layer from which to start collecting tree item IDs.
 * @returns {string[]} An array of tree item IDs.
 */
const getChildIdsRecursively = (layer: BaseLayer): string[] => {
  if (layer instanceof ThemeLayer || layer instanceof GroupLayer) {
    return [layer.treeItemId, ...layer.children.flatMap((child) => getChildIdsRecursively(child))];
  }
  return [layer.treeItemId];
};
