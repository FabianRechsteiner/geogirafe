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
      if (key in currentObj) {
        parentObject = currentObj;
        lastKey = key;
        currentObj = currentObj[key];
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
