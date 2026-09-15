// SPDX-License-Identifier: Apache-2.0
import OauthComponent from '../auth/component';

export default class MobileOauthComponent extends OauthComponent {
  override templateUrl = '../auth/template.html';
  override styleUrls = ['../../styles/common.mobile.css', './style.css'];

  public constructor() {
    super('oauth-mobile');
  }
}
