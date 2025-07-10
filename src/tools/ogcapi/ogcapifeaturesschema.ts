import {
  oapifNumericTypes,
  oapifTemporalTypes,
  oapifTextTypes,
  OapifSchemaResponse,
  OapifPropertySchema
} from '../../models/serverogcapifeatures';

/**
 * Represents the schema for an OGC API collection feature.
 */
export default class OgcApiFeaturesSchema {
  private readonly schema: OapifSchemaResponse;
  public formAttributes: [string, OapifPropertySchema][] = [];

  constructor(schema: OapifSchemaResponse) {
    this.schema = schema;

    // Extract all attributes that can be edited in a form
    for (const [key, properties] of Object.entries(this.schema.properties)) {
      if (this.isGeometry(properties) || this.isPrimaryKey(properties)) continue;
      this.formAttributes.push([key, this.setDefaults(key, properties)]);
    }
    // Sort the attributes according to sequence information (if present)
    this.formAttributes.sort((a, b) => (a[1]['x-ogc-propertySeq'] ?? 0) - (b[1]['x-ogc-propertySeq'] ?? 0));
  }

  /**
   * Generates a template object based on the schema's properties, excluding the geometry.
   */
  get template(): Record<string, number | string | boolean | null> {
    return Object.fromEntries(
      Object.entries(this.schema.properties)
        .filter(([_, properties]) => !this.isGeometry(properties) && !this.isPrimaryKey(properties))
        .map(([key, _]) => [key, null])
    );
  }

  get idAttribute(): string {
    const pk = Object.entries(this.schema.properties).find(([_, properties]) => this.isPrimaryKey(properties));
    return pk ? pk[0] : this.formAttributes[0][0];
  }

  get geometryAttribute(): string | undefined {
    const geometryAttributes = Object.entries(this.schema.properties).filter(([_, properties]) =>
      this.isGeometry(properties)
    );
    if (geometryAttributes.length === 0) return undefined;
    if (geometryAttributes.length === 1) return geometryAttributes[0][0];
    const primaryGeometry = geometryAttributes.find(
      ([_, properties]) => properties['x-ogc-role'] === 'primary-geometry'
    );
    return primaryGeometry ? primaryGeometry[0] : undefined;
  }

  public getProperties(attributeName: string): OapifPropertySchema {
    return this.schema.properties[attributeName];
  }

  public isTextProperty(attributeName: string): boolean {
    return oapifTextTypes.includes(this.getProperties(attributeName).type ?? '');
  }

  public isNumericProperty(attributeName: string): boolean {
    return oapifNumericTypes.includes(this.getProperties(attributeName).type ?? '');
  }

  public isTemporalProperty(attributeName: string): boolean {
    return oapifTemporalTypes.includes(this.getProperties(attributeName).type ?? '');
  }

  private isGeometry(propertySchema: OapifPropertySchema) {
    return propertySchema.format?.startsWith('geometry');
  }

  private isPrimaryKey(propertySchema: OapifPropertySchema) {
    return propertySchema['x-ogc-role'] === 'id';
  }

  private setDefaults(key: string, properties: OapifPropertySchema): OapifPropertySchema {
    return { ...properties, title: properties.title ?? key, type: properties.type ?? 'string' };
  }
}
