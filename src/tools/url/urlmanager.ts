import GirafeSingleton from '../../base/GirafeSingleton';

export default class UrlManager extends GirafeSingleton {
  public getParam(param: string): string | null {
    return new URL(globalThis.location.href).searchParams.get(param);
  }

  /**
   * Read all the arguments from the current url
   */
  public getParams(...args: string[]): Record<string, string | null> {
    const url = new URL(globalThis.location.href);
    const result: Record<string, string | null> = {};
    for (const arg of args) {
      result[arg] = url.searchParams.get(arg);
    }

    return result;
  }

  public getParamsWithPrefix(...prefixList: string[]): Record<string, string | null> {
    const url = new URL(globalThis.location.href);
    const result: Record<string, string | null> = {};
    for (const prefix of prefixList) {
      for (const [key, value] of url.searchParams) {
        if (key.startsWith(prefix)) {
          result[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Remove the arguments from the current url
   */
  public removeParams(...args: string[]) {
    const url = new URL(globalThis.location.href);
    for (const arg of args) {
      url.searchParams.delete(arg);
    }
    this.updateUrl(url);
  }

  /**
   * Return the current root URL
   */
  public getRootUrl() {
    const currentUrl = new URL(globalThis.location.href);
    const pathname = currentUrl.pathname.substring(0, currentUrl.pathname.lastIndexOf('/') + 1);
    const baseUrl = `${currentUrl.protocol}//${currentUrl.host}${pathname}`;
    return baseUrl;
  }

  /**
   * Return the current url without the url parameters
   */
  public getBaseUrlPath() {
    const currentUrl = new URL(globalThis.location.href);
    const baseUrl = `${currentUrl.protocol}//${currentUrl.host}${currentUrl.pathname}`;
    return baseUrl;
  }

  /**
   * Replace the url in the browser
   * @param url url to replace
   * @param data optional data to pass to replaceState
   */
  public updateUrl(url: string | URL, data?: unknown): void {
    globalThis.history.replaceState(data, '', url);
  }

  /**
   * Update the hash of the url
   */
  public updateHash(hash: string) {
    const url = new URL(globalThis.location.href);
    url.hash = hash;
    this.updateUrl(url);
  }

  /**
   * Get the current hash from the url
   */
  public getHash() {
    const url = new URL(globalThis.location.href);
    if (url.hash.length > 0 && url.hash.startsWith('#')) {
      return url.hash.substring(1);
    }
    return null;
  }

  /**
   * Check if the url contains the searched hash
   */
  public hasHash(searchedHash: string) {
    const hash = this.getHash();
    return hash === searchedHash;
  }
}
