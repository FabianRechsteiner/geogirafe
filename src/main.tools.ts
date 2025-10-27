import State from './tools/state/state';
import IGirafeContext from './tools/context/icontext';

// Extend default Document and Window interfaces
declare global {
  interface Document {
    geogirafe: {
      context: IGirafeContext;
      state: State;
    };
  }
  interface Window {
    CESIUM_BASE_URL: string;
    Cesium: unknown;
    cordova: unknown;
    gConfirm(message: string, title?: string): Promise<boolean>;
    gAlert(message: string, title?: string): Promise<boolean>;
    gPrompt(message: string, title?: string, placeholder?: string): Promise<string | false>;
    gOpenWindow(
      title: string,
      url: string,
      width?: string | number,
      height?: string | number,
      top?: string | number,
      left?: string | number
    ): void;
  }
  interface Navigator {
    connection: Connection;
  }
}

interface Connection {
  type: string;
}

export class SplashScreen {
  private splash?: HTMLElement;

  public begin() {
    document.addEventListener('DOMContentLoaded', () => {
      const element = document.getElementById('splash-screen');
      if (!element) {
        console.info('Nor SplashScreen found. Nothing to do.');
        return;
      }

      this.splash = element;
      // At this point, the config and translations have not been loaded yet
      // Therefore, we hardcode this simple 'loading' text and use the browser configuration
      this.setDefaultWaitingText();
    });
  }

  private setDefaultWaitingText() {
    const language = navigator.language.toLowerCase();
    console.debug(`Navigator language: ${language}`);
    let loading = 'Loading...';
    if (language.startsWith('fr')) {
      loading = 'Chargement...';
    } else if (language.startsWith('de')) {
      loading = 'Wird geladen...';
    } else if (language.startsWith('it')) {
      loading = 'Caricamento...';
    }
    (this.splash?.getElementsByTagName('span')[0] as HTMLElement).innerHTML = loading;
  }

  public end() {
    if (this.splash) {
      this.splash.style.opacity = '0';
      setTimeout(() => this.splash!.remove(), 700);
    }
  }
}

export function redirectTo(page: string) {
  const currentUrl = new URL(globalThis.location.href);
  const mobileUrl = new URL(page, globalThis.location.origin);

  const pathParts = currentUrl.pathname.split('/');
  pathParts[pathParts.length - 1] = page;
  mobileUrl.pathname = pathParts.join('/');

  mobileUrl.search = currentUrl.search;
  mobileUrl.hash = currentUrl.hash;
  globalThis.location.href = mobileUrl.toString();
}
