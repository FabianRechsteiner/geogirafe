// SPDX-License-Identifier: Apache-2.0
import OauthComponent from '../auth/component';

export default class MobileOauthComponent extends OauthComponent {
  templateUrl = '../auth/template.html';
  styleUrls = ['../../styles/common.mobile.css', './style.css'];

  public constructor() {
    super('oauth-mobile');
  }
}
