import GeoEvents from '/models/events.js';
import GirafeDraggableElement from '/base/GirafeDraggableElement';
import { WFS } from 'ol/format';
import GML3 from 'ol/format/GML3';
import I18nManager from '/tools/i18nmanager';

class SelectionWindowComponent extends GirafeDraggableElement {

  static #template = null;

  maxFeatures = 200;
  featuresSelected = null;
  activeFeature = null
  content = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  async loadTemplate() {
    if (SelectionWindowComponent.#template !== null) {
      // Template was already loaded. Nothing to do.
      return;
    }
    // Otherwise, load the template
    const response = await fetch('/components/selectionwindow/template.html');
    const content = await response.text();
    SelectionWindowComponent.#template = document.createElement('template');
    SelectionWindowComponent.#template.innerHTML = content;
  }

  render() {
    // Clone component template and add it to the dom
    this.shadow.appendChild(SelectionWindowComponent.#template.content.cloneNode(true));
    this.content = this.shadow.querySelector('#content');
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));
  }

  onMapEvent(details) {
    if (details.action === 'selectFeatures') {
      this.onSelectFeatures(details.selectionParams);
    }
  }

  onSelectFeatures(selectionParams) {

    this.messageManager.sendMessage(GeoEvents.Map, { action: 'clearSelection' });

    for (let i = 0; i < selectionParams.length; ++i) {
      const selectionParam = selectionParams[i];
      // WMS GetFatureInfo
      // const url = source.getFeatureInfoUrl(e.coordinate, viewResolution, this.srid, {'INFO_FORMAT': 'text/plain'/*, 'QUERY_LAYERS': queryLayers*/});
      // if (url) {
      //   fetch(url)
      //     .then((response) => response.text())
      //     .then((html) => console.log(html));
      // }

      // TODO REG: read this parameters from WFS-Capabilities
      const outputFormat = 'GML3';
      const geometryName = 'the_geom';

      // WFS GetFeature
      const featureRequest = new WFS().writeGetFeature({
        srsName: selectionParam.srid,
        //featureNS: 'http://mapserver.gis.umn.edu/mapserver',
        //featurePrefix: 'feature',
        featureTypes: selectionParam.featureTypes,
        maxFeatures: this.maxFeatures,
        outputFormat: outputFormat,
        // TODO REG: get the right geometry column name
        geometryName: geometryName,
        bbox: selectionParam.selectionBox,
        //resultType: 'hits'
        /*filter: andFilter(
          likeFilter('name', 'Mississippi*'),
          equalToFilter('waterway', 'riverbank')
        ),*/
      });

      fetch(selectionParam.wfsUrl, {
        method: 'POST',
        body: new XMLSerializer().serializeToString(featureRequest),
      })
        .then((response) => { return response.text() })
        .then((gml) => {
          // TODO REG: Use the right GML Format (from WFS-Capabilities), not always GML3
          this.featuresSelected = new GML3().readFeatures(gml);
          if (this.featuresSelected.length === 0) {
            // No feature selected
            this.host.style.display = 'none';
          }
          else {
            // Select feature on the map
            this.messageManager.sendMessage(GeoEvents.Map, { action: 'featuresSelected', features: this.featuresSelected });

            this.host.style.display = 'block';
            this.header.innerHTML = '';
            this.content.innerHTML = '';

            // Default, selected the first feature
            this.activateFeature(this.featuresSelected[0]);
          }
        });
    }
  }

  activateFeature(feature) {
    this.header.innerHTML += feature.getId();
    const properties = feature.getProperties();
    const table = document.createElement('table');
    for (const key in properties) {

      // Exclude openlayers properties and geometry
      // TODO REG: Find the right geometry property using WFS Capabilities
      if (key !== 'boundedBy' && key !== 'the_geom') {
        const tr = document.createElement('tr');
        
        const td = document.createElement('td');
        td.className = 'label';
        td.setAttribute('i18n', 'girafe');
        td.innerHTML = key;
        tr.appendChild(td);

        const val = document.createElement('td');
        val.className = 'value';
        val.innerHTML = properties[key];
        tr.appendChild(val);

        table.appendChild(tr);
      }
    }

    this.content.appendChild(table);

    // Translate data
    I18nManager.getInstance().translate(this.shadow);
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      this.makeDraggable();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-selection-window', SelectionWindowComponent);

export default SelectionWindowComponent;
