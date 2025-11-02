import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import Basemap from '../../models/basemaps/basemap';
import BasemapEmpty from '../../models/basemaps/basemapempty';
import { applyOpacityToLayers } from '../../tools/utils/utils';

class BasemapComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  constructor() {
    super('basemap');
  }

  changeBasemap(basemap: Basemap) {
    if (basemap.opacity == 0) return;

    const basemapProjection = basemap.projection ?? this.context.configManager.Config.map.srid;
    const hasSameProjection = this.state.projection == basemapProjection;
    if (!hasSameProjection) {
      if (this.state.activeBasemaps.length > 0 && !(this.state.activeBasemaps[0] instanceof BasemapEmpty)) {
        throw new Error(
          "Can't add a Basemap with a different Projection (" +
            basemap.projection +
            ') than existing Basemaps (' +
            this.state.projection +
            ').'
        );
      }
    }
    this.state.projection = basemapProjection;

    const opacityDisabled = basemap.opacity == -1;
    const activeBasemaps = [...this.state.activeBasemaps];
    if (opacityDisabled) {
      const idx = activeBasemaps.findIndex((activeBasemap: Basemap) => activeBasemap.opacity == -1);
      if (idx >= 0) {
        activeBasemaps.splice(idx, 1);
      }
      activeBasemaps.unshift(basemap);
    } else {
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
    if (basemap.opacity == -1) {
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

  connectedCallback() {
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
