import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import Basemap from '../../../models/basemaps/basemap';
import GroupLayer from '../../../models/layers/grouplayer';
import Layer from '../../../models/layers/layer';
import ThemeLayer from '../../../models/layers/themelayer';

export default class MobileThemeComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.mobile.css', './style.css'];

  public activeTab: 'themes' | 'basemaps' | 'selected' = 'themes';

  public activeLayersByGroup = new Map<GroupLayer, Layer[]>();

  constructor() {
    super('themes-select');
  }

  registerEvents() {
    this.subscribe('interface.swipeupPanelContent', () => {
      this.refreshRender();
    });

    this.subscribe('themes.lastSelectedTheme', () => {
      this.refreshRender();
    });

    this.subscribe('themes.isLoaded', (_: boolean, isLoaded: boolean) => {
      if (isLoaded) {
        this.refreshRender();
      }
    });

    this.subscribe(/layers\.layersList\..*\.activeState/, () => {
      this.setActiveLayersByGroups();
    });
  }

  private setActiveLayersByGroups() {
    const activeLayers = this.context.layerManager.getFlattenedLayerTree(this.state.layers.layersList).filter((l) => {
      return l instanceof Layer && l.active;
    }) as Layer[];

    const activeLayersByGroups = new Map<GroupLayer, Layer[]>();
    for (const layer of activeLayers) {
      let parent = layer.parent as GroupLayer;
      while (parent.parent instanceof GroupLayer) {
        // Get the top parent
        parent = parent.parent;
      }

      let children: Layer[];
      if (activeLayersByGroups.has(parent)) {
        children = activeLayersByGroups.get(parent)!;
      } else {
        children = [];
        activeLayersByGroups.set(parent, children);
      }
      children.push(layer);
    }

    this.activeLayersByGroup = activeLayersByGroups;

    // Do not call refreshRender here, because if the user delesect a layer, we want to keep it visible
    // until he switch tab. This will allow him to reselect it if he wants
    const counter = this.shadow.getElementById('counter');
    if (counter) {
      counter.innerHTML = `(${activeLayers.length})`;
    }
  }

  public changeTab(tab: 'themes' | 'basemaps' | 'selected') {
    this.activeTab = tab;
    this.refreshRender();
  }

  public changeBasemap(basemap: Basemap) {
    this.state.projection = basemap.projection ?? this.context.configManager.Config.map.srid;
    this.state.activeBasemaps = [basemap];
    this.refreshRender();
  }

  // TODO REG : Merge with method onThemeChanged from the desktop component
  public changeTheme(theme: ThemeLayer) {
    this.state.themes.lastSelectedTheme = theme;
    if (theme.disclaimer) {
      this.state.infobox.elements.push({
        id: theme.treeItemId,
        text: theme.disclaimer,
        type: 'info'
      });
    }

    if (theme.location != null || theme.zoom != null) {
      const view = this.context.mapManager.getMap().getView();
      view.animate({
        center: theme.location ?? view.getCenter(),
        zoom: theme.zoom ?? view.getZoom(),
        duration: 1000
      });
    }

    this.refreshRender();
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    if (!this.context.configManager.Config.basemaps.show) {
      this.context.stateManager.state.interface.basemapComponentVisible = false;
      this.shadow.getElementById('basemap-button')!.style.display = 'none';
    }
    this.registerEvents();
  }
}
