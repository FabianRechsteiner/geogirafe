import { v4 as uuidv4 } from 'uuid';

export default class ServiceWorkerHelper {
  private readonly serviceWorker: ServiceWorker | null = null;

  public constructor(sw: ServiceWorker | null) {
    this.serviceWorker = sw;
  }

  /**
   * This method sends a message to the service worker and waits for a response.
   * It resolves when the service worker responds with a message that contains the same `messageId` as sent.
   * @param message The message to send to the service worker.
   * @returns
   */
  public async sendMessageToServiceWorker(message: object) {
    return new Promise<void>((resolve, reject) => {
      if (!this.serviceWorker) {
        reject(new Error('ServiceWorker is not initialized. Cannot send message.'));
        return;
      }

      const messageId = uuidv4();
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for response')), 3000);
      const handleResponse = (event: Event) => {
        if ((event as ExtendableMessageEvent).data.messageId === messageId) {
          clearTimeout(timeout);
          navigator.serviceWorker.removeEventListener('message', handleResponse);
          resolve();
        }
      };
      navigator.serviceWorker.addEventListener('message', handleResponse);
      this.serviceWorker.postMessage({ messageId: messageId, ...message });
    });
  }
}
