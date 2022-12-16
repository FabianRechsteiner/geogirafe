import GeoEvents from '/models/events.js';
import GirafeDraggableElement from '/base/GirafeDraggableElement';
import { WFS } from 'ol/format';
import GML3 from 'ol/format/GML3';
import I18nManager from '/tools/i18nmanager';

class SelectionWindowComponent extends GirafeDraggableElement {

  maxFeatures = 200;
  selectedFeatures = null;
  focusedIndex = null;

  content = null;
  previousButton = null;
  nextButton = null;
  counter = null;

  constructor() {
    super('selectionwindow');
  }

  render() {
    super.render();
    this.content = this.shadow.querySelector('#content');
    this.previousButton = this.shadow.querySelector('#previous');
    this.nextButton = this.shadow.querySelector('#next');
    this.counterText = this.shadow.querySelector('#counter');
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));
    this.previousButton.addEventListener('click', (e) => this.onFocusFeature(this.focusedIndex - 1, e));
    this.nextButton.addEventListener('click', () => this.onFocusFeature(this.focusedIndex + 1));
  }

  onMapEvent(details) {
    if (details.action === 'selectFeatures') {
      this.onSelectFeatures(details.selectionParams);
    }
  }

  onSelectFeatures(selectionParams) {

    this.messageManager.sendMessage(GeoEvents.Map, { action: 'clearSelection' });
    this.selectedFeatures = [];

    const promises = [];
    for (let i = 0; i < selectionParams.length; ++i) {
      const selectionParam = selectionParams[i];
      // WMS GetFatureInfo
      // const url = source.getFeatureInfoUrl(e.coordinate, viewResolution, this.srid, {'INFO_FORMAT': 'text/plain'/*, 'QUERY_LAYERS': queryLayers*/});
      // if (url) {
      //   fetch(url)
      //     .then((response) => response.text())
      //     .then((html) => console.log(html));
      // }

      // TODO REG: read those parameters from WFS-Capabilities
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

      promises.push(fetch(selectionParam.wfsUrl, {
        method: 'POST',
        body: new XMLSerializer().serializeToString(featureRequest),
      }));
    }

    Promise.all(promises)
      .then(async (responses) => { 
        for (let i=0; i<responses.length; ++i) {
          const gml = await responses[i].text();
          // TODO REG: Use the right GML Format (from WFS-Capabilities), not always GML3
          const features = new GML3().readFeatures(gml);
          this.selectedFeatures.push(...features);
        }

        if (this.selectedFeatures.length === 0) {
          // No feature selected
          this.host.style.display = 'none';
        }
        else {
          // Select feature on the map
          this.messageManager.sendMessage(GeoEvents.Map, { action: 'featuresSelected', features: this.selectedFeatures });

          this.host.style.display = 'block';
          this.header.innerHTML = '';
          this.content.innerHTML = '';

          // Default, selected the first feature
          this.onFocusFeature(0);
        }
      });
  }

  onFocusFeature(index) {
    console.log('Focus on ' + index);
    this.focusedIndex = index;
    this.focusFeature(this.selectedFeatures[this.focusedIndex]);
  }

  focusFeature(feature) {

    this.messageManager.sendMessage(GeoEvents.Map, { action: 'featureFocused', feature: feature });

    // Title (draggable header)
    const id = feature.getId();
    const featureType = (id === undefined) ? 'UNKNOWN' : id.split('.')[0];
    this.header.setAttribute('i18n', featureType);

    // Content
    const properties = feature.getProperties();
    const table = document.createElement('table');
    for (const key in properties) {

      // Exclude openlayers properties and geometry
      // TODO REG: Find the right geometry property using WFS Capabilities
      if (key !== 'boundedBy' && key !== 'the_geom') {
        const tr = document.createElement('tr');
        
        const td = document.createElement('td');
        td.className = 'label';
        td.setAttribute('i18n', key);
        tr.appendChild(td);

        const val = document.createElement('td');
        val.className = 'value';
        val.innerHTML = properties[key];
        tr.appendChild(val);

        table.appendChild(tr);
      }
    }

    this.content.innerHTML = '';
    this.content.appendChild(table);

    // Enable/Disable Previous/next buttons
    this.enableNavigationButtons();

    // Translate data
    I18nManager.getInstance().translate(this.shadow);
  }

  enableNavigationButtons() {
    let previousDisplay = 'block';
    let nextDisplay = 'block';
    if (this.focusedIndex === 0) {
      previousDisplay = 'none';
    }
    if (this.focusedIndex === this.selectedFeatures.length - 1) {
      nextDisplay = 'none';
    }

    this.previousButton.style.display = previousDisplay;
    this.nextButton.style.display = nextDisplay;

    // Set counter text
    if (this.selectedFeatures.length === 1) {
      this.counterText.innerHTML = '';
    }
    else {
      this.counterText.innerHTML = (this.focusedIndex+1) + '/' + this.selectedFeatures.length;
    }
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
