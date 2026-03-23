// SPDX-License-Identifier: Apache-2.0
/**
 * Get a property value out of an object by providing the path to the property.
 * @returns the property or object, following the given path, and the
 * parent and last key to the parent object to be able to set it (see also setPropertyByPath).
 */
export const getPropertyByPath = (obj: any, path: string) => {
  let currentObj = obj;
  let parentObject = null;
  let lastKey = null;
  if (path.trim() !== '') {
    const keys = path.split('.');

    for (const key of keys) {
      const escapedKey = key.replaceAll(/[()?*\\]/g, '').trim(); // Remove regex operators
      // When you split /position(\..*)? you might get an empty string as key.
      if (escapedKey === '') {
        continue;
      }
      if (currentObj && escapedKey in currentObj) {
        parentObject = currentObj;
        lastKey = escapedKey;
        currentObj = currentObj[escapedKey];
      } else {
        return { found: false, object: null, parentObject, lastKey };
      }
    }
  }
  return { found: true, object: currentObj, parentObject, lastKey };
};

/**
 * Sets the value of a property specified by a given path in an object.
 * @returns true if the property was set successfully, false otherwise.
 */
export const setPropertyByPath = (obj: any, path: string, value: any): boolean => {
  const result = getPropertyByPath(obj, path);
  if (result.parentObject && result.lastKey) {
    result.parentObject[result.lastKey] = value;
    return true;
  }
  return false;
};

/**
 * @returns a nested object from a given path of keys. The most deeply nested value will be an empty object.
 */
export const createObjectFromPath = (path: string) => {
  const keys = path.split('.');
  const resultObject: Record<string, unknown> = {};
  let pointer = resultObject;

  keys.forEach((key) => {
    const addLevel = () => (pointer[key] = {});
    pointer = key ? addLevel() : pointer;
  });

  return resultObject;
};

/**
 * Deletes a property in an object and all its predecessors, if they otherwise would be empty objects.
 */
export const deletePropertyByPath = (obj: any, path: string) => {
  const result = getPropertyByPath(obj, path);
  if (result.found && result.parentObject && result.lastKey) {
    // Property exists, delete it
    delete result.parentObject[result.lastKey];
  } else if (!result.found && result.parentObject && result.lastKey) {
    // Predecessor exits, delete it if it does not contain any other properties
    if (Object.keys(result.parentObject[result.lastKey]).length === 0) {
      delete result.parentObject[result.lastKey];
    } else {
      // This predecessor contains additional properties, no more predecessor cna be removed
      return;
    }
  } else {
    // Function arrived at root level of object
    return;
  }
  deletePropertyByPath(obj, path);
};

/**
 * Merges the properties of two objects recursively. If properties in both objects
 * are of type 'object', they will be merged deeply. Otherwise, properties in the
 * second object will overwrite properties with the same keys in the first object.
 *
 * @param obj1 - The target object to be merged into.
 * @param obj2 - The source object providing properties to merge.
 * @returns The merged object containing properties from both input objects.
 */
export const mergeObjects = (obj1: Record<string, unknown>, obj2: Record<string, unknown>) => {
  for (const key in obj2) {
    if (Object.hasOwn(obj1, key)) {
      if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
        mergeObjects(obj1[key] as Record<string, unknown>, obj2[key] as Record<string, unknown>);
      } else {
        obj1[key] = obj2[key];
      }
    } else {
      obj1[key] = obj2[key];
    }
  }
  return obj1;
};
