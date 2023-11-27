/** Works at the moment only for MapServer
 * See Documentation, here: https://www.mapserver.org/ogc/filter_encoding.html
 */
class FilterHelper {
  static isNumeric(str: string) {
    return str.trim().length > 0 && !isNaN(Number(str)); // ensure strings of whitespace fail or mixed chars and numbers like '2n'
  }

  public static getFilter(
    operator: string,
    propertyName: string,
    propertyType: 'string' | 'integer' | 'double' | 'long' | 'date' | null,
    value: string
  ): string {
    if (!propertyType) {
      throw new Error('The type of the property should never be null !');
    }

    switch (operator) {
      case 'eq':
        if (propertyType === 'string' && FilterHelper.isNumeric(value)) {
          // See https://mapserver-users.osgeo.narkive.com/P0EVA6Qr/wfs-filter-creates-a-query-using-a-number-instead-of-text
          return FilterHelper.likeFilter(propertyName, value);
        } else {
          return FilterHelper.eqFilter(propertyName, value);
        }
      case 'neq':
        if (propertyType === 'string' && FilterHelper.isNumeric(value)) {
          // See https://mapserver-users.osgeo.narkive.com/P0EVA6Qr/wfs-filter-creates-a-query-using-a-number-instead-of-text
          return FilterHelper.nlikeFilter(propertyName, value);
        } else {
          return FilterHelper.neqFilter(propertyName, value);
        }
      case 'gt':
        return FilterHelper.gtFilter(propertyName, value);
      case 'gte':
        return FilterHelper.gteFilter(propertyName, value);
      case 'lt':
        return FilterHelper.ltFilter(propertyName, value);
      case 'lte':
        return FilterHelper.lteFilter(propertyName, value);
      case 'like':
        return FilterHelper.likeFilter(propertyName, '*' + value + '*');
      case 'nlike':
        return FilterHelper.nlikeFilter(propertyName, '*' + value + '*');
      case 'nul':
        return FilterHelper.eqFilter(propertyName, '');
      case 'nnul':
        return FilterHelper.neqFilter(propertyName, '');
      default:
        throw new Error('Unknown filter operator');
    }
  }

  private static eqFilter(name: string, value: string) {
    return `<Filter><PropertyIsEqualTo><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsEqualTo></Filter>`;
  }

  private static neqFilter(name: string, value: string) {
    return `<Filter><Not><PropertyIsEqualTo><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsEqualTo></Not></Filter>`;
  }

  private static ltFilter(name: string, value: string) {
    return `<Filter><PropertyIsLessThan><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsLessThan></Filter>`;
  }

  private static lteFilter(name: string, value: string) {
    return `<Filter><PropertyIsLessThanOrEqualTo><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsLessThanOrEqualTo></Filter>`;
  }

  private static gtFilter(name: string, value: string) {
    return `<Filter><PropertyIsGreaterThan><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsGreaterThan></Filter>`;
  }

  private static gteFilter(name: string, value: string) {
    return `<Filter><PropertyIsGreaterThanOrEqualTo><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsGreaterThanOrEqualTo></Filter>`;
  }

  private static likeFilter(name: string, value: string) {
    return `<Filter><PropertyIsLike wildcard='*' singleChar='.' escape='!'><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsLike></Filter>`;
  }

  private static nlikeFilter(name: string, value: string) {
    return `<Filter><Not><PropertyIsLike wildcard='*' singleChar='.' escape='!'><PropertyName>${name}</PropertyName><Literal>${value}</Literal></PropertyIsLike></Not></Filter>`;
  }
}

export default FilterHelper;
