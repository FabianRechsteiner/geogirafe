import ImageWMS from 'ol/source/ImageWMS';
import tippy from 'tippy.js';
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import Layer from '../../models/layers/layer';
import LayerManager from '../../tools/layermanager';
import LayerWms from '../../models/layers/layerwms';
import LayerLocalFile from '../../models/layers/layerlocalfile';
import QueryBuilderComponent from '../querybuilder/component';
import GeoEvents from '../../models/events';

class TreeViewItemComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  layerManager: LayerManager;

  layer: Layer;
  iconUrl: string | null = null;
  legendUrls: Record<string, string> = {};

  constructor(layer: Layer) {
    super('treeviewitem');

    this.layerManager = LayerManager.getInstance();
    this.layer = layer;
  }

  render() {
    // If we come from a html element, the layer was not defined in the constructor
    // And we have to set the layer using the id passed to the layerid attribute
    const layerId = this.getAttribute('layerid');
    if (layerId) {
      this.layer = this.layerManager.getTreeItem(layerId) as Layer;
      if (this.layer instanceof LayerWms) {
        // Get Legend Url
        this.setWmsLegend();
      }
    }
    super.render();
    this.createOpacityTooltip();
    this.createFilterTooltip();
    this.createTooltips();
  }

  setWmsLegend() {
    if (!(this.layer instanceof LayerWms)) {
      // nothing to do if it's not a WMS
      return;
    }

    // Manage Icon URL
    if (this.layer.iconUrl) {
      // A custom legend icon has been defined and can be displayed
      this.iconUrl = this.layer.iconUrl;
    } else if (this.layer.legendRule) {
      // We need to get the legend icon URL from WMS
      this.iconUrl = Object.values(this.getLegendImageUrlFromWms(true))[0];
    } else {
      // All other cases, we do not have any icon for the layer
      // => A simple selection icon will be rendered
      this.iconUrl = null;
    }

    // Manage Legend
    if (this.layer.legend) {
      if (this.layer.legendImage) {
        // TODO REG : remove this ! when a refactoring of the Layer class has been done
        this.legendUrls[this.layer.layers!] = this.layer.legendImage;
      } else {
        this.legendUrls = this.getLegendImageUrlFromWms(false);
      }
    }
  }

  getLegendImageUrlFromWms(iconOnly: boolean): Record<string, string> {
    if (!(this.layer instanceof LayerWms)) {
      throw new Error(`${this.layer.name} is not a WMS layer, this method should not be called.`);
    }

    const legends: Record<string, string> = {};
    // TODO REG : remove this ! when a reactoring of the Layer class has been done
    for (const l of this.layer.layers!.split(',')) {
      const wmsSource = new ImageWMS({
        url: this.layer.url,
        params: { LAYERS: l },
        ratio: 1
      });

      let graphicUrl = wmsSource.getLegendUrl(this.state.position.resolution);
      if (!graphicUrl) {
        console.error(`The URL for legend of layer ${l} could not be calculated.`);
        legends[l] = '';
        continue;
      }

      if (!graphicUrl.toLowerCase().includes('sld_version')) {
        // Add SLD_Version (it is mandatory, but openlayers do not seems to set it in the URL)
        graphicUrl += '&SLD_Version=1.1.0';
      }

      if (iconOnly) {
        if (!this.isNullOrUndefined(this.layer.legendRule)) {
          graphicUrl += '&RULE=' + encodeURIComponent(this.layer.legendRule!);
        }
        graphicUrl += '&HEIGHT=' + this.configManager.Config.treeview.defaultIconSize.height;
        graphicUrl += '&WIDTH=' + this.configManager.Config.treeview.defaultIconSize.width;
      }

      legends[l] = graphicUrl;
    }

    return legends;
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
        slider.oninput = (_e) => (this.layer.opacity = parseInt(slider.value) / 20);
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
      placement: 'right',
      appendTo: document.body,
      content: (_reference: object) => {
        const filterbox = new QueryBuilderComponent(this.layer as LayerWms);
        return filterbox;
      }
    });
  }

  registerEvents() {
    this.stateManager.subscribe(
      /layers\.layersList\..*\.isLegendExpanded/,
      (_oldValue: boolean, _newValue: boolean, layer: Layer) => this.refreshRender(layer)
    );
    this.stateManager.subscribe(
      /layers\.layersList\..*\.activeState/,
      (_oldValue: boolean, _newValue: boolean, layer: Layer) => this.refreshRender(layer)
    );
    this.stateManager.subscribe(
      /layers\.layersList\..*\.hasError/,
      (_oldValue: boolean, _newValue: boolean, layer: Layer) => this.refreshRender(layer)
    );
    this.stateManager.subscribe(
      /layers\.layersList\..*\.errorMessage/,
      (_oldValue: boolean, _newValue: boolean, layer: Layer) => this.refreshRender(layer)
    );
    this.stateManager.subscribe(
      /layers\.layersList\..*\.filter/,
      (_oldValue: boolean, _newValue: boolean, layer: Layer) => this.refreshRender(layer)
    );
    this.stateManager.subscribe('treeview.advanced', () => super.render());
    this.stateManager.subscribe('position.resolution', () => this.refreshLegends());
  }

  refreshLegends() {
    if (this.layer instanceof LayerWms) {
      this.setWmsLegend();
    }
    super.render();
  }

  refreshRender(layer: Layer) {
    if (layer === this.layer) {
      super.render();
      this.createTooltips();
    }
  }

  createTooltips() {
    super.activateTooltips(false, [800, 0], 'right');
  }

  toggle(state?: 'on' | 'off') {
    this.layerManager.toggleLayer(this.layer, state);
  }

  zoomToVisibleResolution() {
    if (!(this.layer instanceof LayerWms)) {
      throw new Error(`${this.layer.name} is not a WMS layer, this method should not be called here.`);
    }

    // Because of rounding errors (for example 1.59 becomes 1.589999999999998),
    // we zoom a bit more than just the max resolution.
    // For the moment we try with 10% more
    if (this.layer.maxResolution) {
      const resolution = this.layer.maxResolution - (10 / 100) * this.layer.maxResolution;
      this.state.position.resolution = resolution;
    }
  }

  zoomToFullExtent() {
    if (!(this.layer instanceof LayerLocalFile)) {
      throw new Error(`${this.layer.name} is not a LocalFile layer, this method should not be called here.`);
    }

    this.messageManager.sendMessage({ action: GeoEvents.zoomToExtent, extent: this.layer.extent });
  }

  swipeLayer(side: 'left' | 'right') {
    if (this.layer.activeState === 'off') {
      this.toggle('on');
    }

    const otherSide = side === 'left' ? 'right' : 'left';
    const newSwipedLayers: Record<'left' | 'right', Array<Layer>> = {
      left: [],
      right: []
    };
    // If the object is already present in the other side, we remove it
    newSwipedLayers[otherSide] = this.state.layers.swipedLayers[otherSide].filter((l: Layer) => {
      return l.treeItemId !== this.layer.treeItemId;
    });
    // Then, we add it to right side
    newSwipedLayers[side] = [...this.state.layers.swipedLayers[side]];
    newSwipedLayers[side].push(this.layer);
    // Lastly, we update the state
    this.state.layers.swipedLayers = newSwipedLayers;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }
}

export default TreeViewItemComponent;
