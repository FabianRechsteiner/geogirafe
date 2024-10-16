import ConfigManager from '../configuration/configmanager';
import StateManager from '../state/statemanager';

export default class AuthHelper {
  public static getFetchOptions(includeToken: boolean = false) {
    let fetchOptions: RequestInit | undefined;
    if (ConfigManager.getInstance().Config.oauth || ConfigManager.getInstance().Config.gmfauth) {
      // A authentication is defined (GMF or oAuth2)
      // In this case, we must send credentials (the GMF cookie or will be sent)
      // And we need to deactivate the referer (because GMF limits the referer in some cases)
      fetchOptions = {
        credentials: 'include',
        referrerPolicy: 'no-referrer'
      };

      if (includeToken && StateManager.getInstance().state.oauth.tokens?.access_token) {
        // If there is an access token, we also send it as Authorization Header
        fetchOptions.headers = {
          Authorization: `Bearer ${StateManager.getInstance().state.oauth.tokens!.access_token}`
        };
      }
    }
    return fetchOptions;
  }
}
