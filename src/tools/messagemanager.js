class MessageManager {

  static #instance = null;
  static #initializingSingleton = false;

  translations = null;

  constructor() {
    if (!MessageManager.#initializingSingleton) {
      // If trying to create another instance
      throw new Error('This is a singleton. Please use the getInstance() method.');
    }
  }

  static getInstance() {
    if (MessageManager.#instance === null) {
      // Singleton do not exists 
      // => create it
      MessageManager.#initializingSingleton = true;
      try {
        MessageManager.#instance = new MessageManager();
      }
      finally {
        MessageManager.#initializingSingleton = false;
      }
    }

    return MessageManager.#instance;
  }

  sendMessage(geoEvent, detail) {
    window.dispatchEvent(new CustomEvent(geoEvent, {
      bubbles: true, cancelable: false, composed: true,
      detail
    }));
  }
}

export default MessageManager