import GirafeSingleton from "../base/GirafeSingleton";
import GeoEvents from "../models/events";

class MessageManager extends GirafeSingleton {

  translations = null;

  sendMessage(detail: string) {
    window.dispatchEvent(
      new CustomEvent(GeoEvents.CustomEventType, {
                      bubbles: true, 
                      cancelable: false, 
                      composed: true,
                      detail
    }));
  }

  register(callback: Function) {
    window.addEventListener(GeoEvents.CustomEventType, (e) => {
      const customEvent = e as CustomEvent;
      callback(customEvent.detail)
    });
  }
}

export default MessageManager
