import GirafeSingleton from '../../base/GirafeSingleton';

export abstract class AbstractOauthManager extends GirafeSingleton {
  /** Whether Oauth has a configuration
   *
   * used to:
   * 1) test if we have oauth in general outisde of OauthManager
   * 2) in OauthManager class, throw exception if trying to call oauth functions when unconfigured
   */
  abstract configured(): Promise<boolean>;

  /** Reset the oauth state, without sending any request to issuer/geomapfish */
  abstract reset(): void;

  /** Method to call to do a user login */
  abstract login(): Promise<any>;

  /** Method to call to do a user logout */
  abstract logout(): Promise<any>;

  /** Method to be called before loading themes.json
   *
   * Ensure OAuth is properly initialized and user login status known.
   */
  abstract readyToLoadThemes(): Promise<any>;
}

export default AbstractOauthManager;
