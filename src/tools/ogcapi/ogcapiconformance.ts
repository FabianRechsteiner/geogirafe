// SPDX-License-Identifier: Apache-2.0
//@SONAR_STOP@
const OgcApiConformanceClasses = {
  'features-p1-core': 'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
  'features-p1-geojson': 'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson',

  'features-p2-crs': 'http://www.opengis.net/spec/ogcapi-features-2/1.0/conf/crs',

  'features-p3-queryables': 'http://www.opengis.net/spec/ogcapi-features-3/1.0/conf/queryables',
  'features-p3-queryables-query-parameters':
    'http://www.opengis.net/spec/ogcapi-features-3/1.0/conf/queryables-query-parameters',
  'features-p3-filter': 'http://www.opengis.net/spec/ogcapi-features-3/1.0/conf/filter',
  'features-p3-features-filter': 'http://www.opengis.net/spec/ogcapi-features-3/1.0/conf/features-filter',

  'features-p4-create-replace-delete': 'http://www.opengis.net/spec/ogcapi-features-4/1.0/conf/create-replace-delete',
  'features-p4-update': 'http://www.opengis.net/spec/ogcapi-features-4/1.0/conf/update',
  'features-p4-optimistic-locking-timestamps':
    'http://www.opengis.net/spec/ogcapi-features-4/1.0/req/optimistic-locking-timestamps',
  'features-p4-optimistic-locking-etags':
    'http://www.opengis.net/spec/ogcapi-features-4/1.0/req/optimistic-locking-etags',
  'features-p4-features': 'http://www.opengis.net/spec/ogcapi-features-4/1.0/conf/features',

  'features-p5-schemas': 'http://www.opengis.net/spec/ogcapi-features-5/1.0/conf/schemas',
  'features-p5-core-roles-features': 'http://www.opengis.net/spec/ogcapi-features-5/1.0/conf/core-roles-features',
  'features-p5-feature-references': 'http://www.opengis.net/spec/ogcapi-features-5/1.0/conf/feature-references',
  'features-p5-returnables-and-receivables':
    'http://www.opengis.net/spec/ogcapi-features-5/1.0/conf/returnables-and-receivables',
  'features-p5-queryables': 'http://www.opengis.net/spec/ogcapi-features-5/1.0/conf/queryables',
  'features-p5-sortables': 'http://www.opengis.net/spec/ogcapi-features-5/1.0/conf/sortables'
};
//@SONAR_START@

type ConformanceClass = keyof typeof OgcApiConformanceClasses;

const ogcapi_features_read = ['features-p1-core', 'features-p1-geojson'] satisfies ConformanceClass[];

const ogcapi_features_crs = ['features-p2-crs'] satisfies ConformanceClass[];

const ogcapi_features_query = [
  ...ogcapi_features_read,
  'features-p3-queryables',
  'features-p3-queryables-query-parameters'
] satisfies ConformanceClass[];

const ogcapi_features_simple_write = [
  ...ogcapi_features_read,
  ...ogcapi_features_crs,
  'features-p4-create-replace-delete',
  'features-p5-schemas'
] satisfies ConformanceClass[];

const ogcapi_features_advanced_write = [
  ...ogcapi_features_simple_write,
  'features-p5-core-roles-features',
  'features-p5-feature-references'
] satisfies ConformanceClass[];

const conformanceLevels = {
  ogcapi_features_read,
  ogcapi_features_crs,
  ogcapi_features_query,
  ogcapi_features_simple_write,
  ogcapi_features_advanced_write
} satisfies Record<string, ConformanceClass[]>;

export type ConformanceLevel = keyof typeof conformanceLevels;

const satisfiesConformanceLevel = (conformanceList: string[], level: ConformanceLevel): boolean => {
  return conformanceLevels[level].map(getConformanceClass).every((item) => conformanceList.includes(item));
};

export const getConformanceClass = (className: ConformanceClass): string => {
  return OgcApiConformanceClasses[className];
};

export const serverConformsTo = (conformanceList: string[]): Record<ConformanceLevel, boolean> => {
  return {
    ogcapi_features_read: satisfiesConformanceLevel(conformanceList, 'ogcapi_features_read'),
    ogcapi_features_crs: satisfiesConformanceLevel(conformanceList, 'ogcapi_features_crs'),
    ogcapi_features_query: satisfiesConformanceLevel(conformanceList, 'ogcapi_features_query'),
    ogcapi_features_simple_write: satisfiesConformanceLevel(conformanceList, 'ogcapi_features_simple_write'),
    ogcapi_features_advanced_write: satisfiesConformanceLevel(conformanceList, 'ogcapi_features_advanced_write')
  };
};
