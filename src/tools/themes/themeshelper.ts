import GirafeSingleton from '../../base/GirafeSingleton';
import CustomTheme from '../../models/customtheme';
import BaseLayer from '../../models/layers/baselayer';
import GroupLayer from '../../models/layers/grouplayer';
import ILayerWithFilter from '../../models/layers/ilayerwithfilter';
import Layer from '../../models/layers/layer';
import LayerWms from '../../models/layers/layerwms';
import ThemeLayer from '../../models/layers/themelayer';
import { isTimeAwareLayer, TimeAwareLayer } from '../../models/layers/timeawarelayer';
import WfsFilter, { isWfsOperator } from '../wfs/wfsfilter';
import { KNOWN_FUNCTIONALITIES } from '../functionalities';

type LastSelectedTheme = ThemeLayer | CustomTheme | null;

export type LayerTreeChanges = {
  insertedLayers: BaseLayer[];
  activatedLayers: BaseLayer[];
};

export default class ThemesHelper extends GirafeSingleton {
  public override initializeSingleton() {
    this.context.stateManager.subscribe(
      'themes.lastSelectedTheme',
      (_oldTheme: LastSelectedTheme, newTheme: LastSelectedTheme) => this.onSelectedThemeChanged(newTheme)
    );
  }

  private get state() {
    return this.context.stateManager.state;
  }

  public findBaseLayerById(layerId: number): BaseLayer {
    for (const theme of Object.values(this.state.themes._allThemes)) {
      if (theme.id === layerId) {
        return theme;
      }

      const child = this.findBaseLayerRecursiveById(theme.children, layerId);
      if (child) {
        return child;
      }
    }

    throw new Error(`No BaseLayer with ID ${layerId} could be found.`);
  }

  private findBaseLayerRecursiveById(layers: BaseLayer[], layerId: number): BaseLayer | null {
    for (const layer of layers) {
      if (layer.id === layerId) {
        return layer;
      }
      if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
        const child = this.findBaseLayerRecursiveById(layer.children, layerId);
        if (child) {
          return child;
        }
      }
    }

    return null;
  }

  public findThemeByName(themename: string): ThemeLayer | null {
    for (const theme of Object.values(this.state.themes._allThemes)) {
      if (theme.name === themename) {
        return theme;
      }
    }

    console.warn(`Layer ${themename} was found, but is not a group`);
    return null;
  }

  public findGroupByName(groupname: string): GroupLayer | null {
    const group = this.findBaseLayerByName(groupname);
    if (group instanceof GroupLayer) {
      return group;
    }

    console.warn(`Layer ${groupname} was found, but is not a group`);
    return null;
  }

  public findLayerByName(layername: string): Layer | null {
    const layer = this.findBaseLayerByName(layername);
    if (layer instanceof Layer) {
      return layer;
    }

    if (layer !== null) {
      console.warn(`Layer ${layername} was found, but is not a layer`);
    }
    return null;
  }

  private findBaseLayerByName(layername: string): BaseLayer | null {
    for (const theme of Object.values(this.state.themes._allThemes)) {
      const layer = this.findLayerRecursive(theme.children, layername);
      if (layer) {
        return layer;
      }
    }

    console.warn(`Layer ${layername} not found!`);
    return null;
  }

  private findLayerRecursive(layers: BaseLayer[], layername: string): BaseLayer | null {
    for (const layer of layers) {
      if (layer.name === layername) {
        return layer;
      }
      if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
        const child = this.findLayerRecursive(layer.children, layername);
        if (child) {
          return child;
        }
      }
    }

    return null;
  }

  private onSelectedThemeChanged(theme: ThemeLayer | CustomTheme | null) {
    if (!theme) {
      // Theme is null, nothing to do here
      return;
    }

    if (theme instanceof CustomTheme) {
      theme.layers.sort((a, b) => a.order - b.order);
      for (const t of theme.layers) {
        this.onThemeChanged(t);
      }
    } else {
      this.onThemeChanged(theme);
    }
  }

  private onThemeChanged(theme: ThemeLayer) {
    // Create a clone of the theme object to use it in the treeview.
    // This is essential, otherwise all changes are done in the layers
    // (For example, when expanding legend, expanding a group, or activating the layer).
    // Will also be done in the default layer configuration that has been loaded from themes.json,
    // And when a theme is selected aging from the themes-selector
    // The default configuration will have been overwritten.
    const clonedTheme = theme.clone();

    const themeAlreadyInLayersList = this.state.layers.layersList.find((l) => l.id == clonedTheme.id);
    if (themeAlreadyInLayersList) {
      themeAlreadyInLayersList.isHighlighted = true;
      const layername = this.context.i18nManager.getTranslation(clonedTheme.name);
      const msg = this.context.i18nManager
        .getTranslation('The theme {name} is already present in the treeview.')
        .replace('{name}', layername);
      this.state.infobox.elements.push({
        id: theme.treeItemId,
        text: msg,
        type: 'info',
        duration: 5000
      });
      return;
    }

    if (this.context.configManager.Config.themes.selectionMode === 'replace') {
      // Mode is <replace>
      this.emptyLayerTree();
      this.state.layers.layersList.push(clonedTheme);
    } else {
      // Mode is <add>
      clonedTheme.order = this.getInitialOrderForNewTheme();
      this.state.layers.layersList.push(clonedTheme);
    }

    const themeFunctionalities = this.state.themes._allFunctionalities[theme.id];
    if (themeFunctionalities) {
      for (const functionality of Object.keys(themeFunctionalities)) {
        if (KNOWN_FUNCTIONALITIES.includes(functionality)) {
          this.state.functionalities[functionality] = themeFunctionalities[functionality];
        } else {
          console.warn(`Unknown functionality '${functionality}' found on Theme '${theme.name}'.`);
        }
      }
    }
  }

  public getMinimalClonedThemeForLayer(layer: BaseLayer): ThemeLayer {
    const hierarchy = this.getHierarchyFromLayer(layer);
    const theme = hierarchy[0] as ThemeLayer;
    const clone = theme.clone();
    // Remove unnecessary clones
    let children = clone.children;
    for (let i = 1; i < hierarchy.length; ++i) {
      this.removeOthers(children, hierarchy[i]);
      (children[0] as GroupLayer).isExpanded = true;
      children = (children[0] as GroupLayer).children;
    }

    const clonedLayer = this.findBaseLayerRecursiveById([clone], layer.id);
    if (clonedLayer) {
      clonedLayer.isHighlighted = true;
    }

    return clone;
  }

  private removeOthers(layers: BaseLayer[], keep: BaseLayer) {
    for (let i = layers.length - 1; i >= 0; --i) {
      if (layers[i].id !== keep.id) {
        layers.splice(i, 1);
      }
    }
  }

  private getHierarchyFromLayer(layer: BaseLayer): BaseLayer[] {
    if (layer instanceof ThemeLayer) {
      return [layer];
    }
    if (!layer.parent) {
      throw new Error('A group or a layer should always have a parent.');
    }
    const parents = this.getHierarchyFromLayer(layer.parent);
    return [...parents, layer];
  }

  public addThemesFromUrl() {
    let themeAdded = false;
    if (this.context.permalinkManager.hasThemes()) {
      for (const themename of this.context.permalinkManager.getThemes()) {
        const theme = Object.values(this.state.themes._allThemes).find((t) => t.name === themename);
        if (theme) {
          this.state.themes.lastSelectedTheme = theme;
          themeAdded = true;
        } else {
          console.warn(`Theme ${themename} cannot be found`);
        }
      }
    }
    return themeAdded;
  }

  public addGroupsFromUrl(): boolean {
    let added = false;
    if (this.context.permalinkManager.hasGroups()) {
      for (const groupname of this.context.permalinkManager.getGroups()) {
        added = this.addLayerBaseFromUrl(groupname, 'group') || added;
      }
    }
    return added;
  }

  public addLayersFromUrl(): boolean {
    let added = false;
    if (this.context.permalinkManager.hasLayers()) {
      for (const layername of this.context.permalinkManager.getLayers()) {
        added = this.addLayerBaseFromUrl(layername, 'layer') || added;
      }
    }
    return added;
  }

  private addLayerBaseFromUrl(layer: string, type: 'layer' | 'group'): boolean {
    let added = false;
    const layerOptions = this.extractLayerOptions(layer, type);
    if (layerOptions) {
      const clonedTheme = this.getMinimalClonedThemeForLayer(layerOptions.originalLayer);
      this.mergeLayerWithExistingLayerTree(clonedTheme, this.state.layers.layersList);
      added = true;
      if (layerOptions.active) {
        const clonedLayer = this.findLayerRecursive(clonedTheme.children, layerOptions.originalLayer.name);
        if (clonedLayer) {
          this.context.layerManager.toggle(clonedLayer, 'on');
          if (layerOptions.opacity) {
            (clonedLayer as Layer).opacity = layerOptions.opacity;
          }
          if (layerOptions.filter) {
            (clonedLayer as unknown as ILayerWithFilter).filter = layerOptions.filter;
          }
          if (layerOptions.timeRestriction) {
            (clonedLayer as TimeAwareLayer).timeRestriction = layerOptions.timeRestriction;
          }
        }
      }
    } else {
      console.warn(`Layer ${layer} cannot be found`);
    }
    return added;
  }

  private extractLayerOptions(urlParam: string, type: 'layer' | 'group') {
    let active = true;
    if (urlParam.startsWith('!')) {
      active = false;
      urlParam = urlParam.substring(1);
    }

    const layerOptions = urlParam.split('|');
    const layername = layerOptions[0];
    const layerOrGroup = type === 'layer' ? this.findLayerByName(layername) : this.findGroupByName(layername);
    if (!layerOrGroup) {
      // No layer found
      return;
    }
    let opacity = undefined;
    let filter = undefined;
    let timeRestriction = undefined;
    for (let i = 1; i < layerOptions.length; ++i) {
      const option = layerOptions[i];
      if (option.startsWith('o;')) {
        opacity = this.extractLayerOptionOpacity(layerOrGroup, option);
      } else if (option.startsWith('f;')) {
        filter = this.extractLayerOptionFilter(layerOrGroup, option);
      } else if (option.startsWith('t;')) {
        timeRestriction = this.extractLayerOptionTime(layerOrGroup, option);
      }
    }

    return {
      originalLayer: layerOrGroup,
      active: active,
      opacity: opacity,
      filter: filter,
      timeRestriction: timeRestriction
    };
  }

  private extractLayerOptionOpacity(layerOrGroup: Layer | GroupLayer, option: string): number | undefined {
    if (!(layerOrGroup instanceof Layer)) {
      console.warn('Permalink: opacity configuration is only allowed for layers.');
      return;
    }
    return Number(option.substring(2));
  }

  private extractLayerOptionFilter(layerOrGroup: Layer | GroupLayer, option: string): WfsFilter | undefined {
    if (!(layerOrGroup instanceof Layer)) {
      console.warn('Permalink: filter configuration is only allowed for layers.');
      return;
    }
    if (!(layerOrGroup instanceof LayerWms)) {
      console.warn('Permalink: filter configuration is only allowed for layers that support filters.');
      return;
    }
    const filterParams = option.substring(2).split(';');
    const filterProperty = filterParams[0];
    const filterOperator = filterParams[1];
    if (!isWfsOperator(filterOperator)) {
      console.warn('Permalink: filter operator is unknown.');
      return;
    }
    const filterValue = filterParams[2];
    const filterPropertyType = filterParams.length > 3 ? filterParams[3] : 'string';

    return new WfsFilter(filterProperty, filterOperator, filterValue, undefined, filterPropertyType);
  }

  private extractLayerOptionTime(layerOrGroup: Layer | GroupLayer, option: string): string | undefined {
    if (!isTimeAwareLayer(layerOrGroup)) {
      console.warn('Permalink: time configuration is only allowed for layers that support time configuration.');
      return;
    }
    return option.substring(2);
  }

  /**
   * Calculates the initial order (=position) for a new theme in the tree.
   * Themes are added at the top of the tree, but underneath any pinned themes. Defaults to 0.
   * This prevents themes of visibly "jumping" around in the tree after being added due to reordering.
   */
  public getInitialOrderForNewTheme(): number {
    return this.state.layers.layersList
      .filter((l) => l.isPinned)
      .map((l) => l.order)
      .reduce((a, b) => Math.max(a, b), 0);
  }

  public mergeThemeInLayerTree(
    theme: ThemeLayer,
    activate: boolean = false,
    forceTop: boolean = false
  ): LayerTreeChanges {
    theme.order = forceTop ? -1 : this.getInitialOrderForNewTheme();
    const layerTreeChanges = { insertedLayers: [], activatedLayers: [] };
    this.mergeLayerWithExistingLayerTree(theme, this.state.layers.layersList, activate, layerTreeChanges);
    return layerTreeChanges;
  }

  /**
   * This function merges the newLayer at its right place in the LayerTree
   * @param newLayer The layer to insert somewhere in the hierarchy
   * @param existingList
   * @param parent
   * @returns
   */
  private mergeLayerWithExistingLayerTree(
    newLayer: BaseLayer,
    existingList: BaseLayer[],
    activate: boolean = false,
    layerTreeChanges?: LayerTreeChanges,
    parent?: GroupLayer | ThemeLayer
  ) {
    const existingLayer = existingList.find((l) => l.id === newLayer.id);
    if (!existingLayer) {
      // The theme is not already present. We just add the theme to the layertree
      this.addLayerToLayerTree(newLayer, existingList, activate, layerTreeChanges, parent);
      return;
    } else if (newLayer.isHighlighted) {
      this.highlightLayerInLayerTree(existingLayer, activate, layerTreeChanges);
    }

    // Otherwise, we have to merge the themes
    if (
      (newLayer instanceof ThemeLayer || newLayer instanceof GroupLayer) &&
      (existingLayer instanceof ThemeLayer || existingLayer instanceof GroupLayer)
    ) {
      for (const child of newLayer.children) {
        this.mergeLayerWithExistingLayerTree(child, existingLayer.children, activate, layerTreeChanges, existingLayer);
      }
    }
  }

  private highlightLayerInLayerTree(existingLayer: BaseLayer, activate: boolean, layerTreeChanges?: LayerTreeChanges) {
    existingLayer.isHighlighted = true;
    if (existingLayer.parent) {
      existingLayer.parent.isExpanded = true;
    }
    if (activate && existingLayer.inactive) {
      this.context.layerManager.toggle(existingLayer, 'on');
      if (layerTreeChanges) {
        layerTreeChanges.activatedLayers.push(existingLayer);
      }
    }
  }

  private addLayerToLayerTree(
    newLayer: BaseLayer,
    existingList: BaseLayer[],
    activate: boolean = false,
    layerTreeChanges?: LayerTreeChanges,
    parent?: GroupLayer | ThemeLayer
  ) {
    if (parent) {
      newLayer.parent = parent;
    }
    existingList.push(newLayer);
    if (activate) {
      this.context.layerManager.toggle(newLayer, 'on');
    }
    if (layerTreeChanges) {
      layerTreeChanges.insertedLayers.push(newLayer);
    }
  }

  public removeLayersFromLayerTree(layersToRemove: BaseLayer[]) {
    for (const layerToRemove of layersToRemove) {
      this.context.layerManager.toggle(layerToRemove, 'off');
      this.removeLayersFromExistingLayerTree(layerToRemove, this.state.layers.layersList);
    }
  }

  private removeLayersFromExistingLayerTree(layerToRemove: BaseLayer, existingList: BaseLayer[]) {
    const existingLayerIndex = existingList.findIndex((l) => l.id === layerToRemove.id);
    if (existingLayerIndex >= 0) {
      existingList.splice(existingLayerIndex, 1);
    } else {
      for (const element of existingList) {
        if (element instanceof ThemeLayer || element instanceof GroupLayer) {
          this.removeLayersFromExistingLayerTree(layerToRemove, element.children);
        }
      }
    }
  }

  /**
   * Removes all layers from the layer tree except themes that are pinned.
   */
  public emptyLayerTree() {
    const layersToRemove = this.state.layers.layersList.filter((l) => !l.isPinned);
    this.context.stateManager.batchChanges(() => this.removeLayersFromLayerTree(layersToRemove));
  }
}
