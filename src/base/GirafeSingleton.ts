// List of singletons already created
type GirafeSingletonInstances = {
  [type: string]: GirafeSingleton;
}

// List of singletons currently being created
type GirafeSingletonInitializing = {
  [type: string]: boolean;
}

type Constructor<T> = new (type: string) => T

class GirafeSingleton {

  private static instances: GirafeSingletonInstances = {};
  private static initializingSingletons: GirafeSingletonInitializing = {};

  constructor(type: string) {
    if (!(type in GirafeSingleton.initializingSingletons) || !GirafeSingleton.initializingSingletons[type]) {
      throw new Error('This is a singleton. Please use the getInstance() method.');
    }
  }

  static getInstance<T>(this: Constructor<T>): T {
    const type = this.name;
    if (!(type in GirafeSingleton.instances)) {
      // Singleton do not exists
      // => create it
      GirafeSingleton.initializingSingletons[type] = true;
      try {
        // Get the child constructor, and create and instance of the child
        console.log(`Creating Singleton ${type}`);
        const singleton = new this(type);
        GirafeSingleton.instances[type] = singleton as GirafeSingleton;
      }
      finally {
        GirafeSingleton.initializingSingletons[type] = false;
      }
    }

    return GirafeSingleton.instances[type] as T;
  }

  isNullOrUndefined(val: any) {
    return (val === undefined || val === null);
  }

  isNullOrUndefinedOrBlank(val: any) {
    return (val === undefined || val === null || val === '');
  }
}

export default GirafeSingleton;
