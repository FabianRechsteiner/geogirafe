// SPDX-License-Identifier: Apache-2.0
import SearchComponent from '../search/component';

class MobileSearchComponent extends SearchComponent {
  override templateUrl = './template.html';
  override styleUrls = ['../../styles/common.mobile.css', './style.css'];
}

export default MobileSearchComponent;
