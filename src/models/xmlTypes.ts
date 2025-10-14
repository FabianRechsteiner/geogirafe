export const xmlNumberTypesStrList: string[] = [
  'byte',
  'decimal',
  'int',
  'integer',
  'long',
  'negativeInteger',
  'nonNegativeInteger',
  'nonPositiveInteger',
  'positiveInteger',
  'short',
  'unsignedLong',
  'unsignedInt',
  'unsignedShort',
  'unsignedByte',
  'double',
  'boolean'
] as const;

export const xmlStringTypesStrList: string[] = ['string'] as const;
export const xmlDatetimeTypesStrList: string[] = ['date', 'dateTime'] as const;
export const xmlTypesStrList = [
  ...xmlNumberTypesStrList,
  ...xmlStringTypesStrList,
  ...xmlDatetimeTypesStrList
] as const;
export type XmlTypes = (typeof xmlTypesStrList)[number];

export function isStringNumeric(str: string) {
  return str.trim().length > 0 && !isNaN(Number(str)); // ensure strings of whitespace fail or mixed chars and numbers like '2n'
}

export function isString(attributeType: XmlTypes): boolean {
  return xmlStringTypesStrList.includes(attributeType);
}

export function isNumber(attributeType: XmlTypes): boolean {
  return xmlNumberTypesStrList.includes(attributeType);
}

export function isDate(attributeType: XmlTypes): boolean {
  return xmlDatetimeTypesStrList.includes(attributeType);
}
