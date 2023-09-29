import { WFS } from 'ol/format';
import GML3 from 'ol/format/GML3';

import { SelectFeaturesActionDetails, SelectionParams } from '../models/events';
import GirafeSingleton from "../base/GirafeSingleton";
//import ConfigManager from "./configmanager";
import MessageManager from "./messagemanager";
import StateManager from "./state/statemanager";
import GeoEvents from '../models/events';

class WfsManager extends GirafeSingleton {

  messageManager: MessageManager;
  stateManager: StateManager;
  get state() {
    return this.stateManager.state;
  }

  //TODO: make this configurable
  maxFeatures: number = 10000;

  wfsUrlLoaded: string[] = [];
  featureTypeToGeometryAttributeName: { [key: string]: string; } = {};

  constructor(type: string) {
    super(type);

   /* this.configManager = ConfigManager.getInstance();*/
    this.stateManager = StateManager.getInstance();
    this.messageManager = MessageManager.getInstance();

/*    this.configManager.loadConfig()
      .then(() => { this.loadThemes(); })
      .then(() => { console.log('Themes were loaded'); });*/

    //this.stateManager.subscribe('selectedTheme', (oldTheme, newTheme) => this.onChangeTheme(newTheme));
    this.messageManager.register(this.onCustomGirafeEvent.bind(this));
  }

  onCustomGirafeEvent(details: SelectFeaturesActionDetails) {
    if (details.action === GeoEvents.selectFeatures) {
      this.onSelectFeatures(details.selectionParams);
    }
  }

  onSelectFeatures(selectionParams: SelectionParams[]) {

    this.state.loading = true;

    // Reset current selection
    this.state.selectedFeatures = [];

    // First, we have to load the DescribeFeatureType for this WFS server if this wasn't done yet
    const wfsToInitialize: string[] = [];
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
            const elementTypeToName: {[key: string]: string} = {};
            const elements = xml.querySelectorAll(':scope>element');
            for (let j = 0; j < elements.length; ++j) {
              const element = elements[j];
              if (element.hasAttribute('name') && element.hasAttribute('type')) {
                const name = element.getAttribute('name');
                let type = element.getAttribute('type');
                if (type && name) {
                  if (type.includes(':')) {
                    type = type.split(':')[1];
                  }
                  elementTypeToName[type] = name;
                }
              }
              else {
                console.log('What happend with this element?');
              }
            }
            // Then, find all "complexType" elements
            const tags = xml.getElementsByTagName("complexType");
            for (let i=0; i<tags.length; i++) {
              const tag = tags[i];
              const typeName = tag.getAttribute('name');
              if (!typeName) {
                throw new Error('Could not find a name for the complex type');
              }
              const featureType = elementTypeToName[typeName];
              const elements = tag.getElementsByTagName('sequence')[0].getElementsByTagName('element');
              for (let j=0; j<=elements.length; ++j) {
                const element = elements[j];
                const type = element.getAttribute('type');
                if (type && type.startsWith('gml:')) {
                  // We are on the geometry attribute
                  const geometryAttributeName = element.getAttribute('name');
                  if (geometryAttributeName) {
                    this.featureTypeToGeometryAttributeName[featureType] = geometryAttributeName;
                  }
                  break;
                }
              }
              // If we didn't find any geometry attribute for this featureType, then we have a problem
              // Because the wfs query won't be possible
              if (!(featureType in this.featureTypeToGeometryAttributeName)) {
                throw new Error('No Geometry column for the type ' + featureType);
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

  getDescribeFeatureTypeUrl(wfsUrl: string) {
    const url = new URL(wfsUrl);
    url.searchParams.set('service', 'WFS');
    url.searchParams.set('request', 'DescribeFeatureType');
    // TODO REG: Manage different WFS versions
    url.searchParams.set('version', '1.1.0');

    return url.href;
  }

  wfsQuery(selectionParams: SelectionParams[]) {
    const promises = [];

    for (let i = 0; i < selectionParams.length; ++i) {
      const selectionParam = selectionParams[i];

      // Test if all layers have the same geometry column name
      const columnNameToFeatureType: {[key: string]: string[]} = {};
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
          // TODO: this should be configurable
          featureNS: 'https://mapserver.gis.umn.edu/mapserver',
          featurePrefix: 'feature',
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
        const selectedFeatures = [];
        for (let i=0; i<responses.length; ++i) {
          const gml = await responses[i].text();
          // TODO REG: Do we always want to use the format GML3 here ?
          const features = new GML3().readFeatures(gml);
          selectedFeatures.push(...features);
        }

        if (selectedFeatures.length === 0) {
          // No feature selected
          this.state.interface.selectionGridVisible = false;
        }
        else {
          this.state.selectedFeatures = selectedFeatures;
          this.state.interface.selectionGridVisible = true;

          /*this.host.style.display = 'block';
          this.header.innerHTML = '';
          this.content.innerHTML = '';*/

          // Default, selected the first feature
          /*this.onFocusFeature(0);*/
        }

        this.state.loading = false;
      });
  }
}

export default WfsManager