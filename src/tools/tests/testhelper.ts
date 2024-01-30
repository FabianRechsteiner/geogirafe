class TestHelper {
  public static obj2ContainsObj1PropertiesValues(obj1: any, obj2: any) {
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
      return false;
    }

    for (let key in obj1) {
      if (obj2.hasOwnProperty(key)) {
        if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
          if (!TestHelper.obj2ContainsObj1PropertiesValues(obj1[key], obj2[key])) {
            return false;
          }
        } else if (obj1[key] !== obj2[key]) {
          // Property is different
          return false;
        }
      } else {
        // Property is missing
        return false;
      }
    }

    return true;
  }
}

export default TestHelper;
