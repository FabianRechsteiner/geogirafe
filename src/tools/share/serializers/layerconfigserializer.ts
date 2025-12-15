import { IBrainSerializer } from '../../state/brain/serialize';
import LayersConfig from '../../state/layersConfig';
import GroupLayer from '../../../models/layers/grouplayer';
import ThemeLayer from '../../../models/layers/themelayer';

import Layer from '../../../models/layers/layer';
import BaseLayer from '../../../models/layers/baselayer';
import { isTimeAwareLayer } from '../../../models/layers/timeawarelayer';
import LayerWms from '../../../models/layers/layerwms';
import WfsFilter from '../../wfs/wfsfilter';
import IGirafeContext from '../../context/icontext';
import ThemeLayerExternal from '../../../models/layers/themelayerexternal';
import LayerWmsExternal from '../../../models/layers/layerwmsexternal';
import LayerWmtsExternal from '../../../models/layers/layerwmtsexternal';
import {
  SharedExternalLayer,
  SharedExternalTheme,
  SharedFilter,
  SharedInternalGroup,
  SharedInternalLayer,
  SharedInternalTheme,
  SharedLayer
} from './sharedtypes';
import ServerOgc from '../../../models/serverogc';

export default class LayersConfigSerializer implements IBrainSerializer<LayersConfig> {
  private readonly context: IGirafeContext;

  public constructor(context: IGirafeContext) {
    this.context = context;
  }

  private get state() {
    return this.context.stateManager.state;
  }

  public brainSerialize(layersConfig: LayersConfig): string {
    return this.serialize(layersConfig.layersList);
  }

  protected serialize(layers: BaseLayer[]) {
    const sharedLayers = this.getSerializedLayerTree(layers);
    return JSON.stringify(sharedLayers);
  }

  public brainDeserialize(str: string) {
    const deserializedLayers = this.deserialize(str);
    // Remove all existing layers
    for (const layer of this.context.stateManager.state.layers.layersList) {
      this.context.layerManager.toggle(layer, 'off');
    }
    this.state.layers.layersList = [];

    for (const deserializedLayer of deserializedLayers) {
      this.state.layers.layersList.push(deserializedLayer);
    }
  }

  protected deserialize(str: string) {
    const sharedState = JSON.parse(str);
    return this.getDeserializedLayerTree(sharedState);
  }

  private getSerializedLayerTree(layers: BaseLayer[]) {
    const sharedLayers = [];
    for (const layer of layers) {
      try {
        const sharedLayer = this.getSerializedLayer(layer);
        sharedLayers.push(sharedLayer);
      } catch {
        console.warn(`Cannot serialize layer with id ${layer.id} and name ${layer.name}. Skipping it.`);
      }
    }
    return sharedLayers;
  }

  protected getSerializedLayer(layer: BaseLayer): SharedLayer {
    if (layer instanceof ThemeLayerExternal) {
      return this.getExternalSerializedTheme(layer);
    }
    if (layer instanceof LayerWmsExternal || layer instanceof LayerWmtsExternal) {
      return this.getExternalSerializedLayer(layer);
    }

    if (layer instanceof ThemeLayer || layer instanceof GroupLayer) {
      return this.getInternalSerializedGroupOrTheme(layer);
    }

    return this.getInternalSerializedLayer(layer as Layer);
  }

  private getExternalSerializedTheme(theme: ThemeLayerExternal): SharedExternalTheme {
    const sharedChildren = [];
    for (const child of theme.children) {
      const sharedChild = this.getSerializedLayer(child);
      sharedChildren.push(sharedChild);
    }

    return {
      name: theme.name,
      order: theme.order,
      checked: Number(theme.active),
      isExpanded: Number(theme.isExpanded),
      children: sharedChildren
    };
  }

  private getExternalSerializedLayer(layer: LayerWmsExternal | LayerWmtsExternal): SharedExternalLayer {
    const sharedLayer: SharedExternalLayer = {
      order: layer.order,
      checked: Number(layer.active),
      isExpanded: Number(layer.isLegendExpanded),
      opacity: layer.opacity,
      swiped: layer.swiped
    };

    if (layer instanceof LayerWmtsExternal) {
      sharedLayer.wmts = {
        name: layer.name,
        url: layer.url,
        layer: layer.layer
      };
    } else if (layer instanceof LayerWmsExternal) {
      sharedLayer.wms = {
        name: layer.layers!,
        title: layer.name,
        url: layer.ogcServer.url
      };
    }

    return sharedLayer;
  }

  private getInternalSerializedGroupOrTheme(group: ThemeLayer | GroupLayer): SharedInternalTheme | SharedInternalGroup {
    const originalTheme = this.context.themesHelper.findBaseLayerById(group.id) as ThemeLayer;
    const sharedChildren: SharedInternalLayer[] = [];
    const removedChildrenIds: number[] = [];
    for (const originalChild of originalTheme.children) {
      const index = group.children.findIndex((el) => el.id === originalChild.id);
      if (index >= 0) {
        // Element was found => it is still in the list
        const sharedChild = this.getSerializedLayer(group.children[index]) as SharedInternalLayer;
        sharedChildren.push(sharedChild);
      } else {
        // Element is not in the list any more, and therefore should not be shared or restored
        removedChildrenIds.push(originalChild.id);
      }
    }

    return {
      id: group.id,
      order: group.order,
      checked: Number(group.active),
      isExpanded: Number(group.isExpanded),
      timeRestriction: isTimeAwareLayer(group) ? group.timeRestriction : undefined,
      children: sharedChildren,
      excludedChildrenIds: removedChildrenIds
    };
  }

  private getInternalSerializedLayer(layer: Layer): SharedInternalLayer {
    return {
      id: layer.id,
      order: layer.order,
      checked: Number(layer.active),
      isExpanded: Number(layer.isLegendExpanded),
      opacity: layer.opacity,
      swiped: layer.swiped,
      filter:
        layer instanceof LayerWms && this.context.layerManager.isLayerWithFilter(layer)
          ? (layer.filter as SharedFilter)
          : undefined,
      timeRestriction: isTimeAwareLayer(layer) ? layer.timeRestriction : undefined
    };
  }

  private getDeserializedLayerTree(sharedLayers: SharedLayer[]): BaseLayer[] {
    const layersList: BaseLayer[] = [];
    for (const sharedLayer of sharedLayers) {
      let layer;
      if ('id' in sharedLayer) {
        // Id attribute found => we are on an internal layer
        layer = this.findBaseLayerById(sharedLayer.id);
        if (layer) {
          this.deserializeInternalObject(layer, sharedLayer);
        } else {
          console.warn(`Cannot find layer with id ${sharedLayer.id} in the available layers`);
        }
      } else {
        layer = this.deserializeExternalObject(sharedLayer);
      }
      if (layer) {
        layersList.push(layer);
      }
    }
    return layersList;
  }

  private deserializeInternalObject(
    layer: BaseLayer,
    sharedLayer: SharedInternalTheme | SharedInternalGroup | SharedInternalLayer
  ): BaseLayer | null {
    if (layer instanceof ThemeLayer) {
      this.deserializeInternalTheme(layer, sharedLayer as SharedInternalTheme);
    } else if (layer instanceof GroupLayer) {
      this.deserializeInternalGroup(layer, sharedLayer as SharedInternalGroup);
    } else {
      this.deserializeInternalLayer(layer as Layer, sharedLayer as SharedInternalLayer);
    }

    return layer;
  }

  private deserializeInternalTheme(theme: ThemeLayer, sharedTheme: SharedInternalTheme) {
    theme.order = sharedTheme.order;
    theme.isDefaultChecked = Boolean(sharedTheme.checked);
    theme.isExpanded = Boolean(sharedTheme.isExpanded);
    this.removeUnnecessaryChilds(theme, sharedTheme);
    this.checkUnknownLayers(sharedTheme, theme);
  }

  private deserializeInternalGroup(group: GroupLayer, sharedGroup: SharedInternalGroup) {
    group.order = sharedGroup.order;
    group.isDefaultChecked = Boolean(sharedGroup.checked);
    group.isExpanded = Boolean(sharedGroup.isExpanded);
    this.removeUnnecessaryChilds(group, sharedGroup);
    this.checkUnknownLayers(sharedGroup, group);
    if (isTimeAwareLayer(group)) {
      group.timeRestriction = sharedGroup.timeRestriction;
    }
  }

  private deserializeInternalLayer(layer: Layer, sharedLayer: SharedInternalLayer) {
    layer.order = sharedLayer.order;
    layer.isDefaultChecked = Boolean(sharedLayer.checked);
    if (sharedLayer.opacity) {
      layer.opacity = sharedLayer.opacity;
    }
    if (sharedLayer.swiped) {
      layer.swiped = sharedLayer.swiped;
    }
    if (this.context.layerManager.isLayerWithLegend(layer)) {
      layer.isLegendExpanded = Boolean(sharedLayer.isExpanded);
    }
    if (layer instanceof LayerWms && sharedLayer.filter) {
      layer.filter = new WfsFilter(
        sharedLayer.filter.property,
        sharedLayer.filter.operator,
        sharedLayer.filter.value,
        sharedLayer.filter.value2,
        sharedLayer.filter.propertyType
      );
    }
    if (isTimeAwareLayer(layer)) {
      layer.timeRestriction = sharedLayer.timeRestriction;
    }
  }

  private checkUnknownLayers(
    sharedLayer: SharedInternalTheme | SharedInternalGroup,
    originalLayer: GroupLayer | ThemeLayer
  ) {
    // If some layers are present in the shared state but cannot be found in the current list of available layers
    // It probably means that the layers are private ones or that the layer has been delete.
    // Add an infobox for this.
    for (const sharedChild of sharedLayer.children) {
      if (sharedChild.checked === 1) {
        const originalChild = originalLayer.children.find((c) => c.id == sharedChild.id);
        if (!originalChild) {
          this.context.errorManager.pushMessage(
            'unknown-layers-cannot-be-added',
            'Some layer could not be added to the layer-tree. This is either because you do not have the rights for it, or because this layer does not exist anymore.',
            'warning'
          );
        }
      }
    }
  }

  private removeUnnecessaryChilds(
    originalLayer: GroupLayer | ThemeLayer,
    sharedLayer: SharedInternalTheme | SharedInternalGroup
  ) {
    let reorder = false;
    for (let i = originalLayer.children.length - 1; i >= 0; i--) {
      const child = originalLayer.children[i];
      const serializedChild = sharedLayer.children.find((l) => l.id == child.id);
      if (serializedChild) {
        this.deserializeInternalObject(child, serializedChild);
      } else {
        // This child exists in the original layer, but not in the shared state.
        // => If it is present in the x list, it was explicitely removed
        // And we can remove it from the current object
        const explicitlyRemoved = sharedLayer.excludedChildrenIds.find((id) => id == child.id);
        if (explicitlyRemoved) {
          originalLayer.children.splice(i, 1);
          console.debug(`Layer ${child.name} was removed from initial state`);
        } else {
          // Otherwise it is a new layer. We do not remove it
          // But we have to set the right order for it.
          // In this case we have to reorder all the layers at this level
          // In order to keep the order defined in the initial group
          console.debug(`Layer ${child.name} will be added to the treeview because it is new`);
          console.debug(`Layer ${originalLayer.name} needs a reorering of its children`);
          reorder = true;
        }
      }
    }

    if (reorder) {
      console.debug(`Reordering childs for layer ${originalLayer.name}`);
      let order = 1;
      for (const child of originalLayer.children) {
        child.order = order++;
      }
    }
  }

  private findBaseLayerById(layerId: number): BaseLayer | null {
    for (const theme of Object.values(this.state.themes._allThemes)) {
      const layer = this.findLayerRecursive(theme, layerId);
      if (layer) {
        return layer;
      }
    }
    return null;
  }

  private findLayerRecursive(layer: BaseLayer, layerId: number): BaseLayer | null {
    if (layer.id === layerId) {
      // When deserializing the layer, we clone it,
      // otherwise the following operation will also
      // affect the layer referenced in other themes
      const foundLayer = layer.clone();
      return foundLayer;
    }

    // Else, we call recursively on the children
    if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
      for (const childLayer of layer.children) {
        const foundChild = this.findLayerRecursive(childLayer, layerId);
        if (foundChild) {
          return foundChild;
        }
      }
    }
    return null;
  }

  private deserializeExternalObject(
    sharedLayer: SharedExternalTheme | SharedExternalLayer
  ): ThemeLayerExternal | LayerWmsExternal | LayerWmtsExternal {
    let layer: ThemeLayerExternal | LayerWmsExternal | LayerWmtsExternal;
    if ('children' in sharedLayer) {
      layer = this.deserializeExternalTheme(sharedLayer);
    } else if ('wms' in sharedLayer) {
      layer = this.deserializeExternalWmsLayer(sharedLayer);
    } else if ('wmts' in sharedLayer) {
      layer = this.deserializeExternalWmtsLayer(sharedLayer);
    } else {
      throw new Error('Unsupport external layer type');
    }
    return layer;
  }

  private deserializeExternalTheme(sharedTheme: SharedExternalTheme): ThemeLayerExternal {
    const theme = new ThemeLayerExternal(sharedTheme.name);
    theme.order = sharedTheme.order;
    theme.isDefaultChecked = Boolean(sharedTheme.checked);
    theme.isExpanded = Boolean(sharedTheme.isExpanded);
    for (const sharedChild of sharedTheme.children) {
      const child = this.deserializeExternalObject(sharedChild) as LayerWmsExternal | LayerWmtsExternal;
      child.parent = theme;
      theme.children.push(child);
    }
    return theme;
  }

  private deserializeExternalWmsLayer(sharedLayer: SharedExternalLayer): LayerWmsExternal {
    if (!sharedLayer.wms) {
      throw new Error('Some informations are missing to deserialize this WMS Layer');
    }

    const server = new ServerOgc('external', {
      url: sharedLayer.wms.url,
      type: 'other',
      wfsSupport: true,
      urlWfs: sharedLayer.wms.url,
      imageType: 'image/png'
    });

    const layer = new LayerWmsExternal(sharedLayer.wms.title, sharedLayer.wms.name, server);
    layer.order = sharedLayer.order;
    layer.isDefaultChecked = Boolean(sharedLayer.checked);
    layer.isLegendExpanded = Boolean(sharedLayer.isExpanded);
    if (sharedLayer.opacity) {
      layer.opacity = sharedLayer.opacity;
    }
    if (sharedLayer.swiped) {
      layer.swiped = sharedLayer.swiped;
    }
    return layer;
  }

  private deserializeExternalWmtsLayer(sharedLayer: SharedExternalLayer): LayerWmtsExternal {
    if (!sharedLayer.wmts) {
      throw new Error('Some informations are missing to deserialize this WMTS Layer');
    }

    const layer = new LayerWmtsExternal(sharedLayer.wmts.name, sharedLayer.wmts.url, sharedLayer.wmts.layer);
    layer.order = sharedLayer.order;
    layer.isDefaultChecked = Boolean(sharedLayer.checked);
    layer.isLegendExpanded = Boolean(sharedLayer.isExpanded);
    if (sharedLayer.opacity) {
      layer.opacity = sharedLayer.opacity;
    }
    if (sharedLayer.swiped) {
      layer.swiped = sharedLayer.swiped;
    }
    return layer;
  }
}
