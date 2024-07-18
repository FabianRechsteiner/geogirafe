import {
  equalTo,
  greaterThan,
  greaterThanOrEqualTo,
  isNull,
  lessThan,
  lessThanOrEqualTo,
  like,
  not,
  notEqualTo
} from 'ol/format/filter';
import Filter from 'ol/format/filter/Filter';

import { XmlTypes, isStringNumeric } from '../../models/xmlTypes';

export const wfsOperatorsStrList = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'nlike', 'nul', 'nnul'] as const;
export type WfsOperator = (typeof wfsOperatorsStrList)[number];

export class WfsFilter<WfsXmlTypes = XmlTypes> {
  property: string;
  propertyType?: WfsXmlTypes;
  operator: WfsOperator;
  value: string;

  constructor(property: string, operator: WfsOperator, value: string, propertyType?: WfsXmlTypes) {
    this.property = property;
    this.operator = operator;
    this.value = value;
    this.propertyType = propertyType;
  }

  public toOpenLayersFilter(): Filter {
    if (!this.propertyType) {
      throw new Error('The type of the property should never be null !');
    }

    //(this.property, this.value, propertyType)
    switch (this.operator) {
      case 'eq':
        if (this.propertyType === 'string' && isStringNumeric(this.value)) {
          // See https://mapserver-users.osgeo.narkive.com/P0EVA6Qr/wfs-filter-creates-a-query-using-a-number-instead-of-text
          return like(this.property, '*' + this.value + '*');
        } else {
          return equalTo(this.property, this.value as string | number);
        }
      case 'neq':
        if (this.propertyType === 'string' && isStringNumeric(this.value)) {
          // See https://mapserver-users.osgeo.narkive.com/P0EVA6Qr/wfs-filter-creates-a-query-using-a-number-instead-of-text
          return not(like(this.property, '*' + this.value + '*'));
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
      case 'nul':
        return isNull(this.property);
      case 'nnul':
        return not(isNull(this.property));
      default:
        throw new Error('Unknown filter operator');
    }
  }

  /**
   *
   * @returns a simple filter string that can be used in a WMS GetMap request, does not provide any XML namespace (xmlns attributes)
   */
  toSimpleXmlFilter(): string {
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
