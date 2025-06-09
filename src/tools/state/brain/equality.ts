import { ignoreCloneSymbol } from './decorators';

/**
 * Returns true if the objects are deeply equal, false otherwise
 * Circular references are ignored
 */
export default function areEqual(obj1: any, obj2: any, visitedObjects = new WeakSet()) {
  obj1 = obj1?.__brainIsProxy ? obj1.__brainTarget : obj1;
  obj2 = obj2?.__brainIsProxy ? obj2.__brainTarget : obj2;

  // Same reference
  if (obj1 === obj2) {
    return true;
  }

  // Null & undefined
  if (obj1 === null || obj2 === null || obj1 === undefined || obj2 === undefined) {
    return obj1 === obj2;
  }

  // Already checked
  if (visitedObjects.has(obj1) && visitedObjects.has(obj2)) {
    return true;
  }

  // Primitives
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2;
  }

  // Dates
  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime();
  }

  // Mark the objects as visited
  visitedObjects.add(obj1);
  visitedObjects.add(obj2);

  // Arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    return areArraysEqual(obj1, obj2, visitedObjects);
  }

  if (
    obj1 instanceof WeakMap ||
    obj2 instanceof WeakMap ||
    obj1 instanceof WeakSet ||
    obj2 instanceof WeakSet ||
    obj1 instanceof Map ||
    obj2 instanceof Map ||
    obj1 instanceof Set ||
    obj2 instanceof Set
  ) {
    throw Error('Maps, Sets, WeakMaps and WeakSets deep comparison is not managed.');
  }

  // All other objects
  if (typeof obj1 === 'object' && typeof obj2 === 'object') {
    return areObjectsEqual(obj1, obj2, visitedObjects);
  }

  // Unmanaged case
  throw Error('Unmanaged case for equality check');
}

function areArraysEqual(obj1: any, obj2: any, visitedObjects: WeakSet<any>): boolean | undefined {
  if (obj1.length !== obj2.length) {
    // Different length for both arrays
    return false;
  }
  for (let i = 0; i < obj1.length; i++) {
    if (!areEqual(obj1[i], obj2[i], visitedObjects)) {
      // Not equal
      return false;
    }
  }

  // Arrays are equal
  return true;
}

function areObjectsEqual(obj1: any, obj2: any, visitedObjects: WeakSet<any>): boolean | undefined {
  // Ignore properties that begins with underscore and the ones that should not be cloned
  const keys1 = Object.keys(obj1).filter((key) => !key.startsWith('_') && !obj1[ignoreCloneSymbol]?.includes(key));
  const keys2 = Object.keys(obj2).filter((key) => !key.startsWith('_') && !obj2[ignoreCloneSymbol]?.includes(key));

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!obj2.hasOwnProperty(key)) {
      return false;
    }

    if (!areEqual(obj1[key], obj2[key], visitedObjects)) {
      return false;
    }
  }

  return true;
}
