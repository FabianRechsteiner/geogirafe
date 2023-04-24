import GirafeSingleton from "../base/GirafeSingleton";
import GeoEvents from "../models/events";

class MessageManager extends GirafeSingleton {

  translations = null;

  sendMessage(detail) {
    window.dispatchEvent(
      new CustomEvent(GeoEvents.CustomEventType, {
                      bubbles: true, 
                      cancelable: false, 
                      composed: true,
                      detail
    }));
  }

  register(callback) {
    window.addEventListener(GeoEvents.CustomEventType, (e) => callback(e.detail));
  }
}

export default MessageManager