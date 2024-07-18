import { XmlTypes } from './xmlTypes';

export interface LayerAttribute<WfsXmlTypes = XmlTypes> {
  name: string;
  type: WfsXmlTypes;
}

class ServerWfs<WfsXmlTypes = XmlTypes> {
  name: string;
  url: string;
  layers: Record<string, LayerAttribute<WfsXmlTypes>[]> = {};
  featureTypeToGeometryColumnName: { [key: string]: string } = {};
  initialized: boolean;

  constructor(name: string, url: string) {
    this.name = name;
    this.url = url;
    this.initialized = false;
  }

  addLayerAttribute(layer: string, name: string, type: string) {
    if (!(layer in this.layers)) {
      // Layer does not exists yet
      this.layers[layer] = [];
    }

    this.layers[layer].push({
      name: name,
      type: type as WfsXmlTypes
    });
  }

  getGeometryColumnNameToFeatureTypes(featureTypes: string[]): Record<string, string[]> {
    if (!this.initialized) {
      throw new Error('Initialize WFS server before trying to get geometry column names.');
    }
    const geometryColumnNameToFeatureType: Record<string, string[]> = {};

    for (const featureType of featureTypes) {
      if (!(featureType in this.layers)) {
        console.warn(
          'featureType ' +
            featureType +
            ' is unknown to WFS server ' +
            this.url +
            '\n- available featureTypes: ' +
            Object.keys(this.layers).join(', ')
        );
      }
      const geometryColumnName = this.featureTypeToGeometryColumnName[featureType];
      if (!(geometryColumnName in geometryColumnNameToFeatureType)) {
        geometryColumnNameToFeatureType[geometryColumnName] = [];
      }
      geometryColumnNameToFeatureType[geometryColumnName].push(featureType);
    }

    return geometryColumnNameToFeatureType;
  }
}

export default ServerWfs;
