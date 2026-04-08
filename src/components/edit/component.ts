// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { Draw, Modify, Select } from 'ol/interaction';
import Feature from 'ol/Feature';
import { DrawEvent } from 'ol/interaction/Draw';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { bbox } from 'ol/loadingstrategy';
import { SelectEvent } from 'ol/interaction/Select';
import EditFromComponent from './editform/component';
import OgcApiFeaturesSchema from '../../tools/ogcapi/ogcapifeaturesschema';
import { DEMO_LAYERS } from '../../tools/ogcapi/demolayers';
import { OapifLayer } from '../../models/serverogcapifeatures';
import { getSelectionBoxFromMapClick } from '../../tools/utils/olutils';
import IGirafePanel from '../../tools/state/igirafepanel';

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
const newId = '-';

export default class EditComponent extends GirafeHTMLElement implements IGirafePanel {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  isPanelVisible = false;
  panelTitle = 'edit-panel';
  panelTogglePath = 'interface.editPanelVisible';

  editableLayersList: OapifLayer[] = [];

  private get map() {
    return this.context.mapManager.getMap();
  }

  private draw?: Draw;
  private modify?: Modify;
  private select?: Select;
  private drawingLayer?: VectorLayer;
  private drawingSource?: VectorSource<Feature>;
  private feature?: Feature;

  public form!: EditFromComponent;
  private featureSchema?: OgcApiFeaturesSchema;

  // POC: Demo layers
  private layer?: OapifLayer; // Layer definition / config
  private demoMapLayer?: VectorLayer; // Layer in the map

  public constructor() {
    super('edit');
  }

  override render() {
    super.render();
    if (this.isPanelVisible) {
      this.renderComponent();
      this.state.layers.isSnappingActive = true;
    } else {
      this.renderEmptyComponent();
      this.state.layers.isSnappingActive = false;
    }
    super.girafeTranslate();
  }

  private renderComponent() {
    this.registerInteractionListener('map.select', true);
    this.registerInteractionListener('map.draw', true);
    this.registerInteractionListener('map.modify', true);
    this.collectEditableLayers();
    this.refreshRender();
    if (!this.form) {
      // The attribute form is managed in a subcomponent
      this.form = this.getById('edit-form');
    }
  }

  private renderEmptyComponent() {
    this.resetComponent();
    this.renderEmpty();
  }

  private loginStateChanged() {
    // Editable demo layers should only be available if the user is currently on the matching demo instance and is logged in
    this.editableLayersList = Object.values(DEMO_LAYERS).filter((layer) => {
      try {
        const oapifUrl = new URL(layer.url);
        const themesUrl = new URL(this.context.configManager.Config.themes.url);
        return oapifUrl.hostname === themesUrl.hostname && this.state.oauth.status === 'loggedIn';
      } catch {
        // Cannot parse this.configManager.Config.themes.url as URL.
        // TODO : This should be changed when editing is not just a demo any more
        return false;
      }
    });
    void this.loadDemoServerConfig();
    this.render();
  }

  public async onSelectLayer(evt: Event) {
    const layerId = (evt.target as HTMLInputElement)?.value;
    this.layer = this.editableLayersList.find((layer) => layer.collectionId === layerId);

    this.removeMapInteractions();
    this.unsetEditFeature();

    if (this.layer) {
      this.featureSchema = await this.context.ogcApiFeaturesManager.getSchema(this.layer);
      this.form.setSchema(this.featureSchema);
      this.createDemoMapLayer(); // POC
      this.createMapInteractions();
    } else {
      this.removeDemoMapLayer(); // POC
    }
    this.refreshRender();
  }

  public onStartDrawing() {
    this.unsetEditFeature();
    this.startDrawingMode();
    this.refreshRender();
  }

  public onCancelDrawing() {
    this.onDiscard();
  }

  public onDiscard() {
    this.unsetEditFeature();
    this.startSelectionMode();
    this.refreshRender();
  }

  private startDrawingMode() {
    // Stop selection mode
    this.select?.getFeatures().clear();
    this.select?.setActive(false);
    // Start drawing mode
    this.drawingSource?.clear();
    this.draw?.setActive(true);
  }

  private startSelectionMode() {
    this.draw?.setActive(false);
    this.select?.getFeatures().clear();
    this.select?.setActive(true);
  }

  public onSave() {
    if (!this.feature) return;
    void this.saveFeature();
  }

  public async onDelete() {
    if (!this.feature || !this.canDelete()) return;
    const confirm = await window.gConfirm('Do you want to delete this feature?', 'Delete feature');
    if (confirm) {
      void this.deleteFeature(this.getFeatureId());
    }
  }

  public canDelete(): boolean {
    return this.getFeatureId() !== newId;
  }

  private resetComponent() {
    this.removeMapInteractions();
    this.unselectLayer();
    this.removeDemoMapLayer(); // POC
    this.refreshRender();
  }

  private unselectLayer() {
    this.layer = undefined;
    this.unsetEditFeature();
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
        void this.onSelectFeature(evt);
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
    this.draw.on('drawend', (evt: DrawEvent) => {
      if (!this.canExecute('map.draw')) return;
      this.setEditFeature(evt.feature);
      this.draw?.setActive(false);
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
    this.modify.setActive(false);
  }

  private removeMapInteractions() {
    this.drawingSource?.clear();
    if (this.select) this.map.removeInteraction(this.select);
    if (this.draw) this.map.removeInteraction(this.draw);
    if (this.modify) this.map.removeInteraction(this.modify);
    if (this.drawingLayer) {
      this.map.removeLayer(this.drawingLayer);
      this.drawingLayer = undefined;
    }
  }

  private async onSelectFeature(evt: SelectEvent) {
    this.drawingSource?.clear();
    const bbox = getSelectionBoxFromMapClick(evt.mapBrowserEvent.pixel, this.map, 10);
    const selectedFeature = await this.context.ogcApiFeaturesManager.getItems(
      this.layer!,
      this.map.getView().getProjection().getCode(),
      bbox,
      1
    );
    if (selectedFeature.length > 0) {
      this.setEditFeature(selectedFeature[0]);
      if (this.feature) this.drawingSource?.addFeature(this.feature);
    } else {
      this.unsetEditFeature();
    }
    this.select?.getFeatures().clear();
  }

  private setEditFeature(feature: Feature) {
    if (!feature) {
      this.unsetEditFeature();
      return;
    }
    this.feature = feature;
    this.form.setFeature(this.feature);
    this.modify?.setActive(true);
    this.refreshRender();
  }

  private unsetEditFeature() {
    this.feature = undefined;
    this.drawingSource?.clear();
    this.form?.setFeature(this.feature);
    this.modify?.setActive(false);
    this.refreshRender();
  }

  public isValidForm() {
    return this.form.valid();
  }

  private async saveFeature() {
    if (!this.layer || !this.feature) {
      return;
    }

    const formValues = this.form.getFormValues();
    const featureToSave = new Feature();
    const id = this.getFeatureId();
    featureToSave.setGeometry(this.feature.getGeometry());
    featureToSave.setProperties(formValues);

    if (id === newId) {
      await this.context.ogcApiFeaturesManager.createItem(this.layer, featureToSave);
    } else {
      featureToSave.setId(id);
      await this.context.ogcApiFeaturesManager.updateItem(this.layer, id, featureToSave);
    }
    this.unsetEditFeature();
    this.refreshDemoMapLayer();
    this.startSelectionMode();
  }

  private async deleteFeature(featureId: string) {
    await this.context.ogcApiFeaturesManager.deleteItem(this.layer!, featureId);
    this.unsetEditFeature();
    this.refreshDemoMapLayer();
    this.startSelectionMode();
  }

  private createDemoMapLayer() {
    if (!this.layer) return;
    if (this.demoMapLayer) {
      this.removeDemoMapLayer();
    }
    const vectorSource = new VectorSource({
      loader: async (extent, _resolution, projection) => {
        const features = await this.context.ogcApiFeaturesManager.getItems(this.layer!, projection.getCode(), extent);
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

  public togglePanel(visible: boolean) {
    this.isPanelVisible = visible;
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

  public displayDrawingCancelButton(): boolean {
    return this.draw?.getActive() ?? false;
  }

  public getFeatureId(): string {
    if (this.feature && this.featureSchema) {
      return this.feature.getId()?.toString() ?? newId;
    }
    return '';
  }

  public getFeatureProperties() {
    return this.featureSchema?.formAttributes ?? [];
  }

  /**
   * POC: Add ogc servers to the state and preload them.
   */
  private async loadDemoServerConfig() {
    for (const layer of this.editableLayersList) {
      if (!this.state.ogcServers[layer.server.name]) {
        this.state.ogcServers[layer.server.name] = layer.server;
        await this.context.ogcApiFeaturesManager.getServer(layer.server);

        // A demo layer is defined either by its collection id or title. In the case of the title,
        //  the id is requested from the server and stored in the layer definition.
        if (!layer.collectionId) {
          const collection = await this.context.ogcApiFeaturesManager.getCollectionByTitle(
            layer.collectionTitle,
            layer.server
          );
          if (collection?.title) {
            layer.collectionId = collection.id;
          }
        }
      }
    }
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.subscribe('oauth.status', () => this.loginStateChanged());
    // Add ogc servers to state
    this.subscribe('application.isReady', () => {
      if (this.state.application.isReady) {
        this.loginStateChanged();
      }
    });

    this.render();
  }
}
