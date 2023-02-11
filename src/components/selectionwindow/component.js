import { WFS } from 'ol/format';
import GML3 from 'ol/format/GML3';

import GeoEvents from '../../models/events.js';
import GirafeDraggableElement from '../../base/GirafeDraggableElement';
import I18nManager from '../../tools/i18nmanager';

class SelectionWindowComponent extends GirafeDraggableElement {

  maxFeatures = 200;
  selectedFeatures = null;
  focusedIndex = null;

  content = null;
  previousButton = null;
  nextButton = null;
  counter = null;

  wfsUrlLoaded = [];
  featureTypeToGeometryAttributeName = {};

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

  getDescribeFeatureTypeUrl(wfsUrl) {
    const url = new URL(wfsUrl.toLowerCase());
    url.searchParams.set('service', 'WFS');
    url.searchParams.set('request', 'DescribeFeatureType');
    // TODO REG: Manage different WFS versions
    url.searchParams.set('version', '1.1.0');

    return url.href;
  }

  onSelectFeatures(selectionParams) {

    // Reset current selection
    this.messageManager.sendMessage(GeoEvents.Map, { action: 'clearSelection' });
    this.selectedFeatures = [];

    // First, we have to load the DescribeFeatureType for this WFS server is this wasn't done yet
    const wfsToInitialize = [];
    for (let i = 0; i < selectionParams.length; ++i) {
      if (!this.wfsUrlLoaded.includes(selectionParams[i].wfsUrl)) {
        wfsToInitialize.push(selectionParams[i].wfsUrl);
      }
    }

    if (wfsToInitialize.length === 0) {
      // We can directly do the WFS query
      this.wfsQuery(selectionParams);
    }
    else {
      // We first have to load the missing wfs configuration
      let wfsLoadCount = 0;
      for (let i = 0; i < wfsToInitialize.length; ++i) {
        const url = this.getDescribeFeatureTypeUrl(wfsToInitialize[i]);
        fetch(url)
          .then(response => response.text())
          .then(str => {
            const xml = new DOMParser().parseFromString(str, "text/xml");
            // First find all direct "element" childs
            const elementTypeToName = {};
            const elements = xml.querySelectorAll(':scope>element');
            for (let j = 0; j < elements.length; ++j) {
              const element = elements[j];
              if (element.hasAttribute('name') && element.hasAttribute('type')) {
                const name = element.getAttribute('name');
                let type = element.getAttribute('type');
                if (type.includes(':')) {
                  type = type.split(':')[1];
                }
                elementTypeToName[type] = name;
              }
              else {
                console.log('Why happend with this element?');
              }
            }
            // Then, find all "complexType" elements
            const tags = xml.getElementsByTagName("complexType");
            for (let i=0; i<tags.length; i++) {
              const tag = tags[i];
              const typeName = tag.getAttribute('name');
              const featureType = elementTypeToName[typeName];
              const elements = tag.getElementsByTagName('sequence')[0].getElementsByTagName('element');
              for (let j=0; j<=elements.length; ++j) {
                const element = elements[j];
                const type = element.getAttribute('type');
                if (type.startsWith('gml:')) {
                  // We are on the geometry attribute
                  const geometryAttributeName = element.getAttribute('name');
                  this.featureTypeToGeometryAttributeName[featureType] = geometryAttributeName;
                  break;
                }
              }
              // If we didn't find any geometry attribute for this featureType, then we have a problem
              // Because the wfs query won't be possible
              if (!(featureType in this.featureTypeToGeometryAttributeName)) {
                throw 'No Geometry column for the type ' + featureType;
              }
            }

            // This WFS is now initialized
            this.wfsUrlLoaded.push(wfsToInitialize[i]);

            wfsLoadCount++;
            if (wfsLoadCount === wfsToInitialize.length) {
              // Everything was loaded, we can start the WFS query
              this.wfsQuery(selectionParams);
            }
          });
      }
    }
  }

  wfsQuery(selectionParams) {
    const promises = [];

    for (let i = 0; i < selectionParams.length; ++i) {
      const selectionParam = selectionParams[i];

      // Test if all layers have the same geometry colmn name
      const columnNameToFeatureType = {};
      for (let j = 0; j < selectionParam.featureTypes.length; ++j) {
        const featureType = selectionParam.featureTypes[j];
        const geometryColumnName = this.featureTypeToGeometryAttributeName[featureType];
        if (!(geometryColumnName in columnNameToFeatureType)) {
          columnNameToFeatureType[geometryColumnName] = [];
        }
        columnNameToFeatureType[geometryColumnName].push(featureType);
      }

      for (let [columnName, featureTypes] of Object.entries(columnNameToFeatureType)) {
        // WFS GetFeature
        const featureRequest = new WFS().writeGetFeature({
          srsName: selectionParam.srid,
          //featureNS: 'http://mapserver.gis.umn.edu/mapserver',
          //featurePrefix: 'feature',
          featureTypes: featureTypes,
          maxFeatures: this.maxFeatures,
          // TODO REG: Do we always want to use the format GML3 here ?
          outputFormat: 'GML3',
          // TODO REG: get the right geometry column name
          geometryName: columnName,
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
    }

    // Wait the result of all promises to display responses
    Promise.all(promises)
      .then(async (responses) => { 
        for (let i=0; i<responses.length; ++i) {
          const gml = await responses[i].text();
          // TODO REG: Do we always want to use the format GML3 here ?
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
      super.translate();
      this.makeDraggable();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-selection-window', SelectionWindowComponent);

export default SelectionWindowComponent;
