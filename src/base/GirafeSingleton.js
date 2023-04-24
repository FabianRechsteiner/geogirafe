class GirafeSingleton {

  static #instances = {};
  static #initializingSingletons = {};

  constructor(type) {
    if (!(type in GirafeSingleton.#initializingSingletons) || !GirafeSingleton.#initializingSingletons[type]) {
      throw new Error('This is a singleton. Please use the getInstance() method.');
    }
  }

  static getInstance() {
    const type = this.name;
    if (!(type in GirafeSingleton.#instances)) {
      // Singleton do not exists 
      // => create it
      GirafeSingleton.#initializingSingletons[type] = true;
      try {
        // Get the child constructor, and create and instance of the child
        console.log(`Creating Singleton ${type}`);
        const singleton = new this(type);
        GirafeSingleton.#instances[type] = singleton;
      }
      finally {
        GirafeSingleton.#initializingSingletons[type] = false;
      }
    }

    return GirafeSingleton.#instances[type];
  }
}

export default GirafeSingleton;
