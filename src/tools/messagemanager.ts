import { Extent } from 'ol/extent';
import GirafeSingleton from '../base/GirafeSingleton';
import GeoEvents from '../models/events';
import Layer from '../models/layers/layer';

// TODO REG : Remove this class and all its dependencies. It should'nt be used anymore.
class MessageManager extends GirafeSingleton {
  translations = null;

  sendMessage(detail: Record<string, unknown>) {
    window.dispatchEvent(
      new CustomEvent(GeoEvents.CustomEventType, {
        bubbles: true,
        cancelable: false,
        composed: true,
        detail
      })
    );
  }

  register(callback: (details: { action: string; layer: Layer; extent: Extent }) => void) {
    window.addEventListener(GeoEvents.CustomEventType, (e) => {
      const customEvent = e as CustomEvent;
      callback(customEvent.detail);
    });
  }
}

export default MessageManager;
