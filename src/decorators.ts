// SPDX-License-Identifier: Apache-2.0
/**
 * Use this Decorator to mark a Method that seems unused but is used in the HTML Template.
 * @constructor
 */
export function UsedInTemplateOnly(_reason: string = 'Method is used in HTML Template') {
  return function (_target: object, _propertyKey: string, _descriptor: PropertyDescriptor) {};
}
