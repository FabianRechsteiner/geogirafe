import tippy from 'tippy.js';
import Layer from '../../../models/layers/layer';
import LayerWms from '../../../models/layers/layerwms';
import LayerLocalFile from '../../../models/layers/layerlocalfile';
import QueryBuilderComponent from '../../querybuilder/component';
import LayerWmts from '../../../models/layers/layerwmts';
import Baselayer from '../../../models/layers/baselayer';
import TreeViewElement from '../tools/treeviewelement';
import { isSnappableLayer } from '../../../models/layers/snappablelayer';
import WmsLegendHelper from '../../../tools/wms/wmslegendhelper';

class TreeViewItemComponent extends TreeViewElement {
  templateUrl = './template.html';
  styleUrls = ['../style.css', '../../../styles/common.css'];

  iconUrl: string | null = null;
  legendUrls: Record<string, string> = {};
  wmsLegendHelper!: WmsLegendHelper;

  override layer: Layer;

  public get hasLegend() {
    return this.context.layerManager.isLayerWithLegend(this.layer) && this.layer.legend;
  }

  public get isLegendExpanded() {
    if (this.context.layerManager.isLayerWithLegend(this.layer)) {
      return this.layer.isLegendExpanded;
    }
    return false;
  }

  public toggleLegend() {
    if (this.context.layerManager.isLayerWithLegend(this.layer)) {
      this.layer.isLegendExpanded = !this.layer.isLegendExpanded;
    }
  }

  public toggleSnap() {
    if (isSnappableLayer(this.layer)) {
      this.layer.snapActive = !this.layer.snapActive;
    }
  }

  public constructor(layer: Layer) {
    super(layer, 'treeviewitem');
    this.layer = layer;
  }

  render() {
    // If we come from a html element, the layer was not defined in the constructor
    // And we have to set the layer using the id passed to the layerid attribute
    const layerId = this.getAttribute('layerid');
    if (layerId) {
      this.layer = this.context.layerManager.getTreeItem(layerId) as Layer;
      if (this.layer instanceof LayerWms) {
        // Manage Legend icons for WMS
        this.setWmsLegend();
      }
      if (this.layer instanceof LayerWmts) {
        this.setWmtsLegend();
      }
    }
    super.render();
    this.createOpacityTooltip();
    this.createFilterTooltip();
  }

  private setWmsLegend() {
    if (!(this.layer instanceof LayerWms)) {
      // nothing to do if it's not a WMS
      return;
    }

    this.iconUrl = this.wmsLegendHelper.getIconUrl(this.layer);
    this.legendUrls = this.wmsLegendHelper.getLegendUrls(this.layer);
  }

  setWmtsLegend() {
    if (!(this.layer instanceof LayerWmts)) {
      // nothing to do if it's not a WMS
      return;
    }

    if (this.layer.legend) {
      if (this.layer.legendImage) {
        this.legendUrls[this.layer.name] = this.layer.legendImage;
      } else {
        this.layer.hasError = true;
        this.layer.errorMessage = `The WMTS Layer ${this.layer.name} has no legendImage.`;
      }
    }
  }

  getCrossOrigin(url: string | null) {
    if (!url) {
      return 'anonymous';
    }

    const hostname = new URL(url).hostname;
    return this.state.oauth.audience.includes(hostname) ? 'use-credentials' : 'anonymous';
  }

  createOpacityTooltip() {
    const el = this.shadow.getElementById('opacity');
    tippy(el, {
      trigger: 'click',
      arrow: true,
      interactive: true,
      theme: 'light',
      placement: 'bottom-end',
      content: (_reference: object) => {
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'slider';
        slider.min = '0';
        slider.max = '20';
        slider.value = (this.layer.opacity * 20).toString();
        slider.oninput = () => (this.layer.opacity = parseInt(slider.value) / 20);
        return slider;
      }
    });
  }

  createFilterTooltip() {
    const el = this.shadow.getElementById('filter');
    tippy(el, {
      trigger: 'click',
      arrow: true,
      interactive: true,
      theme: 'light',
      placement: 'bottom',
      appendTo: document.body,
      content: (_reference: object) => {
        const filterbox = new QueryBuilderComponent(this.layer as LayerWms, this.context);
        return filterbox;
      }
    });
  }

  registerEvents() {
    this.subscribe(/layers\..*\.isLegendExpanded/, (_oldValue: boolean, _newValue: boolean, layer: Layer) => {
      this.refreshLegends();
      this.refreshRender(layer);
    });
    this.subscribe(/layers\.layersList\..*\.activeState/, (_oldValue: boolean, _newValue: boolean, layer: Layer) => {
      this.refreshLegends();
      this.refreshRender(layer);
    });
    this.subscribe(/layers\.layersList\..*\.hasError/, (_oldValue: boolean, _newValue: boolean, layer: Layer) =>
      this.refreshRender(layer)
    );
    this.subscribe(/layers\.layersList\..*\.errorMessage/, (_oldValue: boolean, _newValue: boolean, layer: Layer) =>
      this.refreshRender(layer)
    );
    this.subscribe(/layers\.layersList\..*\.filter/, (_oldValue: boolean, _newValue: boolean, layer: Layer) =>
      this.refreshRender(layer)
    );
    this.subscribe(/layers\.layersList\..*\.snapActive/, (_oldValue: boolean, _newValue: boolean, layer: Layer) =>
      this.refreshRender(layer)
    );
    this.subscribe(/layers\.layersList\..*\.timeRestriction/, (_old: boolean, _new: boolean, layer: Baselayer) => {
      if (layer === this.layer || layer === this.layer.parent) this.refreshRender(this.layer);
    });
    this.subscribe(/layers\.layersList\..*\.opacity/, (_oldValue: boolean, _newValue: boolean, layer: Layer) =>
      this.refreshRender(layer)
    );
    this.subscribe(/layers\.layersList\..*\.swiped/, (_oldValue: boolean, _newValue: boolean, layer: Layer) =>
      this.refreshRender(layer)
    );
    this.subscribe('treeview.advanced', () => this.refreshRender(this.layer));
    this.subscribe('position', () => this.refreshLegends());
  }

  refreshLegends() {
    if (this.layer instanceof LayerWms && this.layer.parent.isExpanded && this.layer.isLegendExpanded) {
      this.setWmsLegend();
      super.refreshRender();
    }
  }

  toggle(state?: 'on' | 'off') {
    this.context.layerManager.toggleLayer(this.layer, state);
  }

  zoomToVisibleResolution() {
    if (!(this.layer instanceof LayerWms)) {
      throw new Error(`${this.layer.name} is not a WMS layer, this method should not be called here.`);
    }

    if (this.layer.maxResolution) {
      if (this.context.configManager.Config.map.constrainScales) {
        // We have to find the right resolution
        const allowedResolutions = this.context.mapManager.getMap().getView().getResolutions()!;
        const maxResolution = this.layer.maxResolution;
        const newResolution = allowedResolutions.find((r) => r < maxResolution)!;
        this.state.position.resolution = newResolution;
      } else {
        // We can just zoom to the correct resolution.
        // But because of rounding errors (for example 1.59 becomes 1.589999999999998),
        // we zoom a bit more than just the max resolution (5% more)

        const resolution = this.layer.maxResolution * 0.95;
        this.state.position.resolution = resolution;
      }
    }
  }

  isVisibleInCurrentResolution() {
    if (!(this.layer instanceof LayerWms) && !(this.layer instanceof LayerWmts)) {
      // Always true for not WMS/WMTS layers
      return true;
    }
    const currentResolution = this.state.position.resolution;
    if (currentResolution) {
      return this.layer.isVisibleAtResolution(this.state.position.resolution!);
    }
    return false;
  }

  zoomToFullExtent() {
    if (!(this.layer instanceof LayerLocalFile)) {
      throw new Error(`${this.layer.name} is not a LocalFile layer, this method should not be called here.`);
    }

    this.context.mapManager.zoomToExtent(this.layer.extent);
  }

  public deleteLayer() {
    this.context.layerManager.toggleLayer(this.layer, 'off');
    this.removeFromParent();
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.wmsLegendHelper = new WmsLegendHelper(this.context);
    this.render();
    this.registerEvents();
  }
}

export default TreeViewItemComponent;
