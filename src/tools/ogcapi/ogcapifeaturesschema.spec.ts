import { describe, expect, it } from 'vitest';
import OgcApiFeaturesSchema from './ogcapifeaturesschema';
import { OapifSchemaResponse } from '../../models/serverogcapifeatures';

describe('OgcApiFeaturesSchema', () => {
  const schemaResponse_simple: OapifSchemaResponse = {
    properties: {
      secondaryGeometry: {
        format: 'geometry-any'
      },
      geometry: {
        'format': 'geometry-point',
        'x-ogc-role': 'primary-geometry'
      },
      primaryKey: {
        'type': 'integer',
        'x-ogc-role': 'id', // Primary key
        'x-ogc-propertySeq': 0 // Attribute order
      },
      titleAttribute: {
        'title': 'Attr Title',
        'type': 'string',
        'maxLength': 100,
        'x-ogc-propertySeq': 2
      },
      doubleAttribute: {
        'type': 'number',
        'format': 'double',
        'x-ogc-propertySeq': 1
      }
    }
  };

  it('should generate a sorted list of attributes editable in a form', () => {
    const schema = new OgcApiFeaturesSchema(schemaResponse_simple);
    const attributeNames = schema.formAttributes.map(([attrName, _attrProperties]) => attrName);
    expect(attributeNames).toEqual(['doubleAttribute', 'titleAttribute']);
  });

  it('should generate a template object excluding geometry and primary key fields', () => {
    const schema = new OgcApiFeaturesSchema(schemaResponse_simple);
    expect(schema.template).toEqual({
      titleAttribute: null,
      doubleAttribute: null
    });
  });

  it('should return an empty object for a schema with no properties', () => {
    const emptySchemaResponse: OapifSchemaResponse = { properties: {} };
    const schema = new OgcApiFeaturesSchema(emptySchemaResponse);
    expect(schema.template).toEqual({});
  });

  it('should return an empty object if all schema properties are geometry or primary key fields', () => {
    const schemaResponseOnlyGeometryAndPK: OapifSchemaResponse = {
      properties: {
        primaryKey: {
          'type': 'integer',
          'x-ogc-role': 'id'
        },
        geometry: {
          'format': 'geometry-point',
          'x-ogc-role': 'primary-geometry'
        }
      }
    };
    const schema = new OgcApiFeaturesSchema(schemaResponseOnlyGeometryAndPK);
    expect(schema.template).toEqual({});
  });

  it('should handle a schema with a mix of editable and non-editable properties and set their value to null', () => {
    const schemaResponseMixed: OapifSchemaResponse = {
      properties: {
        primaryKey: {
          'type': 'integer',
          'x-ogc-role': 'id'
        },
        geometry: {
          'format': 'geometry-point',
          'x-ogc-role': 'primary-geometry'
        },
        stringAttribute: {
          'type': 'string',
          'x-ogc-propertySeq': 1
        },
        numberAttribute: {
          'type': 'number',
          'x-ogc-propertySeq': 0
        }
      }
    };
    const schema = new OgcApiFeaturesSchema(schemaResponseMixed);
    expect(schema.template).toEqual({
      stringAttribute: null,
      numberAttribute: null
    });
  });

  it('should return the primary key field as idAttribute', () => {
    const schema = new OgcApiFeaturesSchema(schemaResponse_simple);
    expect(schema.idAttribute).toBe('primaryKey');
  });

  it('should return the primary geometry as `geometryAttribute`', () => {
    const schema = new OgcApiFeaturesSchema(schemaResponse_simple);
    expect(schema.geometryAttribute).toBe('geometry');
  });
});
