import {
  equalTo,
  greaterThan,
  greaterThanOrEqualTo,
  isNull,
  lessThan,
  lessThanOrEqualTo,
  like,
  not,
  notEqualTo,
  between,
  during
} from 'ol/format/filter';
import Filter from 'ol/format/filter/Filter';
import { XmlTypes, isStringNumeric, isString, isDate } from '../../models/xmlTypes';

export const wfsOperatorsStrList = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'nlike',
  'before',
  'after',
  'between',
  'nul',
  'nnul'
] as const;
export type WfsOperator = (typeof wfsOperatorsStrList)[number];

export const mapAttributeTypeToFilterOperators: Record<'string' | 'number' | 'date', WfsOperator[]> = {
  string: ['eq', 'neq', 'like', 'nlike', 'nul', 'nnul'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'nul', 'nnul'],
  date: ['eq', 'neq', 'before', 'after', 'between', 'nnul']
};

const BeginningOfTime = '0001-01-01';
const EndOfTime = '9999-12-31';

export class WfsFilter<WfsXmlTypes extends XmlTypes = XmlTypes> {
  property: string;
  propertyType?: WfsXmlTypes;
  operator: WfsOperator;
  value: string;
  value2: string;

  constructor(property: string, operator: WfsOperator, value: string, value2: string = '', propertyType?: WfsXmlTypes) {
    this.property = property;
    this.operator = operator;
    this.value = value;
    this.value2 = value2;
    this.propertyType = propertyType;

    if (this.operator === 'between' && !this.value2) {
      throw new Error('Between operator needs two filter values !');
    }
  }

  public toOpenLayersFilter(): Filter {
    if (!this.propertyType) {
      throw new Error('The type of the property should never be null !');
    }

    //(this.property, this.value, propertyType)
    switch (this.operator) {
      case 'eq':
        if (isString(this.propertyType) && isStringNumeric(this.value)) {
          // See https://mapserver-users.osgeo.narkive.com/P0EVA6Qr/wfs-filter-creates-a-query-using-a-number-instead-of-text
          return like(this.property, '*' + this.value + '*');
        } else {
          return equalTo(this.property, this.value as string | number);
        }
      case 'neq':
        if (isString(this.propertyType) && isStringNumeric(this.value)) {
          // See https://mapserver-users.osgeo.narkive.com/P0EVA6Qr/wfs-filter-creates-a-query-using-a-number-instead-of-text
          return not(like(this.property, '*' + this.value + '*'));
        } else if (isDate(this.propertyType)) {
          // mapserver does not support notEqualTo for date values, see notes in https://www.mapserver.org/ogc/filter_encoding.html#tests
          return not(equalTo(this.property, this.value));
        } else {
          return notEqualTo(this.property, this.value as string | number);
        }
      case 'gt':
        return greaterThan(this.property, Number(this.value));
      case 'gte':
        return greaterThanOrEqualTo(this.property, Number(this.value));
      case 'lt':
        return lessThan(this.property, Number(this.value));
      case 'lte':
        return lessThanOrEqualTo(this.property, Number(this.value));
      case 'like':
        return like(this.property, '*' + this.value + '*');
      case 'nlike':
        return not(like(this.property, '*' + this.value + '*'));
      case 'before':
        return during(this.property, BeginningOfTime, this.value);
      case 'after':
        return during(this.property, this.value, EndOfTime);
      case 'between':
        if (isDate(this.propertyType)) {
          return during(this.property, this.value, this.value2);
        }
        return between(this.property, Number(this.value), Number(this.value2));
      case 'nul':
        return isNull(this.property);
      case 'nnul':
        if (isDate(this.propertyType)) {
          return notEqualTo(this.property, '');
        }
        return not(isNull(this.property));
      default:
        throw new Error('Unknown filter operator');
    }
  }

  /**
   *
   * @returns a simple filter string that can be used in a WMS GetMap request, does not provide any XML namespace (xmlns attributes)
   */
  toWmsGetMapFilter(): string {
    if (!this.propertyType) {
      throw new Error('The type of the property should never be null !');
    }
    const wildCard = WfsFilter.simpleLikeFilterGenerateWildCard(this.value);

    switch (this.operator) {
      case 'eq':
        if (this.propertyType === 'string' && isStringNumeric(this.value)) {
          // See https://mapserver-users.osgeo.narkive.com/P0EVA6Qr/wfs-filter-creates-a-query-using-a-number-instead-of-text
          return WfsFilter.simpleLikeFilter(this.property, this.value);
        } else {
          return WfsFilter.simpleEqFilter(this.property, this.value);
        }
      case 'neq':
        if (this.propertyType === 'string' && isStringNumeric(this.value)) {
          // See https://mapserver-users.osgeo.narkive.com/P0EVA6Qr/wfs-filter-creates-a-query-using-a-number-instead-of-text
          return WfsFilter.simpleNlikeFilter(this.property, this.value);
        } else {
          return WfsFilter.simpleNeqFilter(this.property, this.value);
        }
      case 'gt':
        return WfsFilter.simpleGtFilter(this.property, this.value);
      case 'gte':
        return WfsFilter.simpleGteFilter(this.property, this.value);
      case 'lt':
        return WfsFilter.simpleLtFilter(this.property, this.value);
      case 'lte':
        return WfsFilter.simpleLteFilter(this.property, this.value);
      case 'like':
        return WfsFilter.simpleLikeFilter(this.property, wildCard + this.value + wildCard, wildCard);
      case 'nlike':
        return WfsFilter.simpleNlikeFilter(this.property, wildCard + this.value + wildCard, wildCard);
      case 'before':
        return WfsFilter.simpleLteFilter(this.property, this.value);
      case 'after':
        return WfsFilter.simpleGteFilter(this.property, this.value);
      case 'between':
        return WfsFilter.simpleBetweenFilter(this.property, this.value, this.value2);
      case 'nul':
        return WfsFilter.simpleEqFilter(this.property, '');
      case 'nnul':
        return WfsFilter.simpleNeqFilter(this.property, '');
      default:
        throw new Error('Unknown filter operator');
    }
  }

  protected static simpleEqFilter(name: string, value: string) {
    return `<Filter><PropertyIsEqualTo><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsEqualTo></Filter>`;
  }

  protected static simpleNeqFilter(name: string, value: string) {
    return `<Filter><Not><PropertyIsEqualTo><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsEqualTo></Not></Filter>`;
  }

  protected static simpleLtFilter(name: string, value: string) {
    return `<Filter><PropertyIsLessThan><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsLessThan></Filter>`;
  }

  protected static simpleLteFilter(name: string, value: string) {
    return `<Filter><PropertyIsLessThanOrEqualTo><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsLessThanOrEqualTo></Filter>`;
  }

  protected static simpleGtFilter(name: string, value: string) {
    return `<Filter><PropertyIsGreaterThan><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsGreaterThan></Filter>`;
  }

  protected static simpleGteFilter(name: string, value: string) {
    return `<Filter><PropertyIsGreaterThanOrEqualTo><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsGreaterThanOrEqualTo></Filter>`;
  }

  protected static simpleBetweenFilter(name: string, value: string, value2: string) {
    return `<Filter><And><PropertyIsGreaterThanOrEqualTo><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsGreaterThanOrEqualTo><PropertyIsLessThanOrEqualTo><PropertyName>${name}</PropertyName><Literal>${value2}</Literal></PropertyIsLessThanOrEqualTo></And></Filter>`;
  }

  protected static simpleInnerLikeFilter(name: string, value: string, wildCard?: string) {
    if (!wildCard) {
      wildCard = WfsFilter.simpleLikeFilterGenerateWildCard(value);
    }
    return `<PropertyIsLike wildCard="${wildCard}" singleChar="." escapeChar="!"><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsLike>`;
  }

  protected static simpleLikeFilter(name: string, value: string, wildCard?: string) {
    return '<Filter>' + this.simpleInnerLikeFilter(name, value, wildCard) + '</Filter>';
  }

  protected static simpleNlikeFilter(name: string, value: string, wildCard?: string) {
    return '<Filter><Not>' + this.simpleInnerLikeFilter(name, value, wildCard) + '</Not></Filter>';
  }

  // TODO: make wildcard/escape/single char configurable in config.json/themes.json?
  // Here is a quickfix for map.bs.ch not accepting * in url params
  protected static simpleLikeFilterGenerateWildCard(value: string): string {
    return 'WABCDEFGIJKLMNOPQRSTUVXYZ'.split('').find((c) => !value.includes(c)) ?? '*';
  }
}

export default WfsFilter;
