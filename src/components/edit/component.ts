import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import StateManager from '../../tools/state/statemanager';
import OgcApiFeaturesManager from '../../tools/ogcapi/ogcapifeaturesmanager';
import MapManager from '../../tools/state/mapManager';
import { Map } from 'ol';
import { Draw, Modify, Select } from 'ol/interaction';
import Feature from 'ol/Feature';
import { DrawEvent } from 'ol/interaction/Draw';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import ServerOgcApi, { LayerOapif } from '../../models/serverogcapi';
import { DEMO_INSTANCES } from '../../tools/ogcapi/ogcapifeaturesclient';
import { bbox } from 'ol/loadingstrategy';
import { SelectEvent } from 'ol/interaction/Select';

const getStyle = (col = 'rgb(255,89,0)', width = 4) => {
  return new Style({
    stroke: new Stroke({ color: col, width: width }),
    fill: new Fill({ color: col }),
    image: new Circle({
      radius: width,
      fill: new Fill({ color: col })
    })
  });
};

const baseStyle = getStyle();
const editStyle = getStyle('rgb(0,81,255)', 6);

export default class EditComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  stateManager: StateManager;
  oapifManager: OgcApiFeaturesManager;

  visible: boolean = false;

  editableLayersList: { name: string; id: string }[] = [];
  isDrawing: boolean = false;
  private readonly map: Map;

  private draw?: Draw;
  private modify?: Modify;
  private select?: Select;
  private drawingLayer?: VectorLayer;
  private drawingSource?: VectorSource<Feature>;
  private feature?: Feature;
  private propertiesTemplate?: Record<string, string | number | null>;

  // POC: Demo layers
  private layer?: LayerOapif; // Layer definition / config
  private demoMapLayer?: VectorLayer; // Layer in the map

  constructor() {
    super('edit');
    this.stateManager = StateManager.getInstance();
    this.oapifManager = OgcApiFeaturesManager.getInstance();
    this.map = MapManager.getInstance().getMap();

    // List of POC demo layers
    //  The GMF demo layer is only selectable when in the experimental demo and logged in
    const isOnGMF29DemoAndLoggedIn =
      this.configManager.Config.themes.url.includes('geomapfish-demo-2-9.camptocamp') &&
      this.state.oauth.status === 'loggedIn';
    this.editableLayersList = Object.keys(DEMO_INSTANCES)
      .filter((layerID) => layerID !== 'GMF' || isOnGMF29DemoAndLoggedIn)
      .map((layerID) => {
        return { id: layerID, name: DEMO_INSTANCES[layerID].name };
      });
  }

  render() {
    super.render();
    this.visible ? this.renderComponent() : this.renderEmptyComponent();
    super.girafeTranslate();
  }

  private renderComponent() {
    this.registerInteractionListener('map.select', true);
    this.registerInteractionListener('map.draw', true);
    this.registerInteractionListener('map.modify', true);
    this.collectEditableLayers();
    this.refreshRender();
  }

  private renderEmptyComponent() {
    this.resetComponent();
    this.renderEmpty();
  }

  public onSelectLayer(evt: Event) {
    const layerId = (evt.target as HTMLInputElement)?.value;
    this.layer = DEMO_INSTANCES[layerId];

    this.removeMapInteractions();
    this.clearForm();

    if (this.layer) {
      this.layer.server = new ServerOgcApi(layerId, this.layer.url, this.layer.serverType);
      this.oapifManager.getItemTemplate(this.layer).then((response) => (this.propertiesTemplate = response));
      this.createDemoMapLayer(); // POC
      this.createMapInteractions();
    } else {
      this.removeDemoMapLayer(); // POC
    }
    this.refreshRender();
  }

  public onStartDrawing() {
    this.drawingSource?.clear();
    this.select?.getFeatures().clear();
    this.select?.setActive(false);
    this.draw?.setActive(true);
    this.isDrawing = true;
    this.refreshRender();
  }

  public onCancelEditing() {
    this.resetComponent();
  }

  public onDiscard() {
    this.select?.getFeatures().clear();
    this.drawingSource?.clear();
    this.refreshDemoMapLayer();
    this.clearForm();
    this.select?.setActive(true);
    this.refreshRender();
  }

  public onSave() {
    this.feature = this.drawingSource?.getFeatures()[0] ?? undefined;
    this.readoutAttributes();
    void this.saveFeature();
  }

  public onDelete() {
    throw new Error('Method not implemented.');
  }

  public hasFeature() {
    return this.drawingSource && this.drawingSource.getFeatures().length > 0;
  }

  private resetComponent() {
    this.removeMapInteractions();
    this.unselectLayer();
    this.removeDemoMapLayer(); // POC
    this.clearForm();
    this.refreshRender();
  }

  private unselectLayer() {
    this.layer = undefined;
    this.getById<HTMLSelectElement>('layer-selector').value = '';
  }

  private collectEditableLayers() {
    // POC
    return;
  }

  private createMapInteractions() {
    if (!this.drawingLayer) {
      // Create drawing layer and source
      this.drawingSource = new VectorSource({});
      this.drawingLayer = new VectorLayer({
        source: this.drawingSource,
        style: editStyle,
        zIndex: 2001
      });
      this.map.addLayer(this.drawingLayer);
    }

    // Interactions
    if (this.select) {
      this.map.removeInteraction(this.select);
    }
    if (this.demoMapLayer) {
      this.select = new Select({
        layers: [this.demoMapLayer],
        hitTolerance: 10,
        style: editStyle
      });
      this.select.on('select', (evt: SelectEvent) => {
        if (!this.canExecute('map.select')) return;
        this.drawingSource?.clear();
        if (evt.selected.length > 0) {
          this.drawingSource?.addFeature(evt.selected[0].clone());
          this.select?.getFeatures().clear();
        }
        this.refreshRender();
      });
      this.map.addInteraction(this.select);
    }
    if (this.draw) {
      this.map.removeInteraction(this.draw);
    }
    this.draw = new Draw({
      source: this.drawingSource,
      condition: () => this.canExecute('map.draw'),
      type: this.layer!.geometryType,
      stopClick: true,
      style: editStyle
    });
    this.draw.on('drawstart', () => {});
    this.draw.on('drawend', (_e: DrawEvent) => {
      this.isDrawing = false;
      this.draw?.setActive(false);
      this.refreshRender();
    });
    this.draw.setActive(false);
    this.map.addInteraction(this.draw);

    if (this.modify) {
      this.map.removeInteraction(this.modify);
    }
    this.modify = new Modify({
      source: this.drawingSource,
      condition: () => this.canExecute('map.modify')
    });
    this.map.addInteraction(this.modify);
  }

  private removeMapInteractions() {
    this.clearDrawing();
    if (this.select) this.map.removeInteraction(this.select);
    if (this.draw) this.map.removeInteraction(this.draw);
    if (this.modify) this.map.removeInteraction(this.modify);
    if (this.drawingLayer) {
      this.map.removeLayer(this.drawingLayer);
      this.drawingLayer = undefined;
    }
  }

  private clearDrawing() {
    this.drawingSource?.clear();
    this.feature = undefined;
    this.draw?.setActive(false);
  }

  private clearForm() {
    const nameInput = this.getById('attribute-name');
    if (nameInput instanceof HTMLInputElement) {
      nameInput.value = '';
    }
  }

  public isValidForm() {
    // POC: Only allow saving for newly created features without an ID
    return this.getFeatureId() === '';
  }

  private readoutAttributes() {
    if (!this.feature || !this.layer) {
      return;
    }
    const nameInput = this.getById('attribute-test');
    const properties = this.getPropertiesTemplate();
    // Set attribute values
    if (Object.keys(properties).includes(this.layer.attributeName)) {
      let attrValue: number | string = (nameInput as HTMLInputElement).value;
      if (this.layer.attributeType === 'number') {
        attrValue = Number(attrValue);
      }
      properties[this.layer.attributeName] = attrValue;
    }
    this.feature.setProperties(properties);
  }

  private getPropertiesTemplate() {
    let properties = { ...this.propertiesTemplate };
    // POC: If the OAPIF service did not provide a schema, use the first feature in the source as a template
    if (Object.keys(properties).length === 0) {
      const randomFeature = this.demoMapLayer!.getSource()!.getFeatures()[0];
      properties = { ...(randomFeature?.getProperties() ?? {}) };
      properties.fid = null;
      delete properties.geometry;
      Object.keys(properties).forEach(function (index) {
        properties[index] = null;
      });
    }
    return properties;
  }

  private async saveFeature() {
    if (!this.layer || !this.feature) {
      return;
    }
    // Create the feature on the server
    const success = await this.oapifManager.createItem(this.layer, this.feature);

    if (success) {
      this.clearDrawing();
      this.clearForm();
      this.refreshDemoMapLayer();
      this.select?.setActive(true);
      this.refreshRender();
    } else {
      void window.gAlert('Error when saving feature', 'Error');
    }
  }

  private createDemoMapLayer() {
    if (!this.layer) return;
    if (this.demoMapLayer) {
      this.removeDemoMapLayer();
    }
    const vectorSource = new VectorSource({
      loader: async (extent, _resolution, _projection) => {
        const features = await this.oapifManager.getItems(this.layer!, extent, this.layer!.crs);
        if (features) {
          vectorSource.addFeatures(features);
        }
      },
      strategy: bbox
    });

    this.demoMapLayer = new VectorLayer({
      source: vectorSource,
      style: baseStyle
    });
    this.map.addLayer(this.demoMapLayer);
  }

  private refreshDemoMapLayer() {
    if (!this.layer) return;

    if (!this.demoMapLayer) {
      this.createDemoMapLayer();
    }
    this.demoMapLayer!.getSource()!.refresh();
  }

  private removeDemoMapLayer() {
    if (this.demoMapLayer) {
      this.map.removeLayer(this.demoMapLayer);
      this.demoMapLayer = undefined;
    }
  }

  private togglePanel(visible: boolean) {
    this.visible = visible;
    this.render();
  }

  public getButtonIcon() {
    let icon = 'draw';
    const geometryType = this.layer?.geometryType ?? '';
    if (geometryType.includes('Point')) {
      icon = 'point';
    } else if (geometryType.includes('Line')) {
      icon = 'polyline';
    } else if (geometryType.includes('Polygon')) {
      icon = 'polygon';
    }
    return `icons/${icon}.svg`;
  }

  public getButtonText() {
    let text = 'Draw geometry';
    const geometryType = this.layer?.geometryType ?? '';
    if (geometryType.includes('Point')) {
      text = geometryType.startsWith('Multi') ? 'Draw points' : 'Draw point';
    } else if (geometryType.includes('Line')) {
      text = geometryType.startsWith('Multi') ? 'Draw lines' : 'Draw line';
    } else if (geometryType.includes('Polygon')) {
      text = geometryType.startsWith('Multi') ? 'Draw polygons' : 'Draw polygon';
    }
    return text;
  }

  public displayDrawingStartButton() {
    return !this.hasFeature() && !this.isDrawing;
  }

  public getFeatureId() {
    return this.drawingSource?.getFeatures()[0]?.getId() ?? '';
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.subscribe('interface.editPanelVisible', (_, newValue) => this.togglePanel(newValue));
      this.render();
    });
  }
}
