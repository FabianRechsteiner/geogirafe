import { cloneDeepWith } from 'lodash-es';
import { ignoreCloneSymbol, ignoreSymbol } from './decorators';

type Primitive = string | number | boolean | bigint | null | undefined;

/**
 * Recursively freezes an object and all its properties to make it immutable.
 * This function also handles circular references by using a `WeakSet` to track visited objects.
 *
 * @param obj - The object to freeze.
 * @param visitedObjects - A `WeakSet` to track objects that have already been visited (used internally).
 */
export function deepFreeze(obj: any, visitedObjects = new WeakSet()) {
  if (isPrimitive(obj)) {
    return;
  }

  // Manage circular references
  if (visitedObjects.has(obj)) {
    return;
  }
  visitedObjects.add(obj);

  Object.freeze(obj);
  for (const prop of Object.getOwnPropertyNames(obj)) {
    if (!isIgnoredProperty(obj, prop) && !isFlagedIgnoreClone(obj, prop)) {
      // Do not freeze ignored objects
      const value = obj[prop];
      if (typeof value === 'object' && value !== null) {
        deepFreeze(value, visitedObjects);
      }
    }
  }
}

/**
 * Customizer function for `cloneDeepWith` to handle specific cloning rules.
 *
 * - Properties starting with `_` are not deeply cloned; their references are copied instead.
 * - Properties flagged with `ignoreCloneSymbol` are not cloned.
 *
 * @param value - The value being cloned.
 * @param prop - The property name or index of the value being cloned.
 * @param target - The target object containing the property being cloned.
 * @returns The value to use for the cloned property, or `undefined` to use the default cloning behavior.
 */
export function deepCloneCustomizer(value: any, prop?: string | number, target?: object) {
  if (isFlagedIgnore(value, prop) || isFlagedIgnoreClone(target, prop) || prop?.toString().startsWith('_')) {
    // Do not clone : just copy the reference
    return value;
  }
  // Else : do nothing special, the default cloneDeep will be used.
}

/**
 * Creates a deep clone of an object, applying custom cloning rules defined in `deepCloneCustomizer`.
 *
 * @param obj - The object to clone.
 * @returns A deep clone of the input object.
 */
export function deepClone(obj: object) {
  return cloneDeepWith(obj, (value, prop, target) => deepCloneCustomizer(value, prop, target));
}

/**
 * Determines if a value is a primitive type.
 *
 * @param value - The value to check.
 * @returns `true` if the value is a primitive type, otherwise `false`.
 */
export function isPrimitive(value: any): value is Primitive {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    value === null ||
    value === undefined
  );
}

/**
 * Determines if a value is a function.
 *
 * @param value - The value to check.
 * @returns `true` if the value is a function, otherwise `false`.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

/**
 * Checks if a property name represents a virtual property.
 * Virtual properties are identified by the prefix `__brain`.
 *
 * @param prop - The property name to check.
 * @returns `true` if the property is a virtual property, otherwise `false`.
 */
export function isVirtualProperty(prop: string): boolean {
  return prop.startsWith('__brain');
}

/**
 * Checks if a function name represents a constructor.
 *
 * @param prop - The property name to check.
 * @returns `true` if the property is a virtual property, otherwise `false`.
 */
export function isConstructor(prop: string): boolean {
  return prop === 'constructor';
}

/**
 * Checks if a property should be ignored during certain operations.
 * Ignored properties are either symbols or start with `_` (unless they are virtual properties).
 *
 * @param prop - The property name or symbol to check.
 * @returns `true` if the property should be ignored, otherwise `false`.
 */
export function isIgnoredProperty(target: any, prop: string | symbol): boolean {
  if (typeof prop === 'symbol') {
    return true;
  }

  if (prop.startsWith('_') && !isVirtualProperty(prop)) {
    return true;
  }

  return isFlagedIgnore(target, prop);
}

/**
 * Checks if a property on a target object is flagged to be ignored during cloning.
 *
 * @param target - The object containing the property.
 * @param prop - The property name or index to check.
 * @returns `true` if the property is flagged to be ignored, otherwise `false`.
 */
export function isFlagedIgnoreClone(target: any, prop?: string | number) {
  return target?.[ignoreCloneSymbol]?.includes(prop);
}

/**
 * Checks if a property on a target object is flagged to be totally ignored by brain.
 *
 * @param target - The object containing the property.
 * @param prop - The property name or index to check.
 * @returns `true` if the property is flagged to be ignored, otherwise `false`.
 */
export function isFlagedIgnore(target: any, prop?: string | number) {
  return target?.[ignoreSymbol]?.includes(prop);
}

/**
 * Determines if a value is of a supported type.
 * Unsupported types include `WeakMap`, `WeakSet`, `Map`, and `Set`.
 *
 * @param value - The value to check.
 * @returns `true` if the value is of a supported type, otherwise `false`.
 */
export function isTypeSupported(value: any): boolean {
  return !(value instanceof WeakMap || value instanceof WeakSet || value instanceof Map || value instanceof Set);
}

/**
 * Checks if a target object implements the iterator protocol.
 *
 * @param target - The object to check.
 * @returns `true` if the target is an iterator, otherwise `false`.
 */
export function isIterator(target: any): boolean {
  return target && typeof target[Symbol.iterator] === 'function' && typeof target.next === 'function';
}
