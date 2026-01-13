import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import Basemap from '../../models/basemaps/basemap';
import { applyOpacityToLayers } from '../../tools/utils/utils';

class BasemapComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  public constructor() {
    super('basemap');
  }

  changeBasemap(basemap: Basemap) {
    if (basemap.opacity == 0) return;

    const newBasemapProjection = basemap.projection ?? this.context.configManager.Config.map.srid;
    const activeBasemaps = [...this.state.activeBasemaps];
    if (basemap.opacityDisabled) {
      // Normal basemap change (no opacity basemap)
      this.state.projection = newBasemapProjection;
      const idx = activeBasemaps.findIndex((activeBasemap: Basemap) => activeBasemap.opacityDisabled);
      if (idx >= 0) {
        activeBasemaps.splice(idx, 1);
      }
      activeBasemaps.unshift(basemap);
    } else {
      // We try to add a basemap with opacity => we do not change the current projection
      // It should adapt to the main selected basemap
      const idx = activeBasemaps.findIndex((activeBasemap) => activeBasemap.id == basemap.id);
      if (idx > -1) {
        activeBasemaps.splice(idx, 1);
      } else {
        activeBasemaps.push(basemap);
      }
    }
    this.state.activeBasemaps = activeBasemaps;

    this.refreshRender();
  }

  isBasemapActive(basemap: Basemap): boolean {
    return this.state.activeBasemaps.some((activeBasemap) => activeBasemap.id == basemap.id);
  }

  determineClassnames(basemap: Basemap) {
    return this.isBasemapActive(basemap) ? 'basemap-container active-basemap' : 'basemap-container';
  }

  changeBasemapOpacity(basemap: Basemap, e: PointerEvent) {
    e.stopPropagation();
    if (basemap.opacityDisabled) {
      console.warn(`Trying to set Opacity on Basemap '${basemap.name}' which does not allow it`);
      return;
    }
    const opacity = Number.parseFloat((e.target as HTMLInputElement).value);
    if (!this.isBasemapActive(basemap)) {
      basemap.opacity = opacity;
      applyOpacityToLayers(basemap.opacity, basemap.layersList);
      this.changeBasemap(basemap);
    }
    const idx = this.state.activeBasemaps.findIndex((activeBasemap) => activeBasemap.id == basemap.id);
    this.state.activeBasemaps[idx].opacity = opacity;
  }

  toggleVisibility(visible: boolean) {
    (this.shadowRoot?.host as HTMLElement).style.display = visible ? 'block' : 'none';
  }

  registerEvents() {
    this.subscribe('basemaps', () => this.render());
    this.subscribe('activeBasemaps', (_oldBasemap: Basemap, _newBasemap: Basemap) => this.refreshRender());
    this.subscribe('themes.isLoaded', () => {
      if (this.state.themes.isLoaded) {
        if (Object.keys(this.state.basemaps).length === 0) {
          this.renderEmpty();
        }
      }
    });
    this.subscribe('interface.basemapComponentVisible', (_oldValue: boolean, newValue: boolean) =>
      this.toggleVisibility(newValue)
    );
  }

  protected override connectedCallback() {
    super.connectedCallback();
    if (this.context.configManager.Config.basemaps.show && this.state.interface.basemapComponentVisible) {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    } else {
      this.state.interface.basemapComponentVisible = false;
      this.renderEmpty();
    }
  }
}

export default BasemapComponent;
