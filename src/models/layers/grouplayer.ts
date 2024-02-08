import { GMFTreeItem } from '../gmf';
import BaseLayer from './baselayer';

class GroupLayer extends BaseLayer {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public isExclusiveGroup: boolean;
  public isExpanded: boolean;
  public activeState: 'on' | 'off' | 'semi' = 'off';

  children: BaseLayer[] = [];

  constructor(elem: GMFTreeItem, order: number) {
    const isDefaultChecked = elem.metadata?.isChecked ?? false;
    const disclaimer = elem.metadata?.disclaimer ?? null;
    super(elem.id, elem.name, order, isDefaultChecked, disclaimer);

    const isDefaultExpanded = elem.metadata?.isExpanded ?? false;
    this.isExpanded = isDefaultExpanded;
    this.isExclusiveGroup = elem.metadata?.exclusiveGroup ?? false;
  }

  get active() {
    return this.activeState === 'on';
  }

  get inactive() {
    return this.activeState === 'off';
  }

  get semiActive() {
    return this.activeState === 'semi';
  }
}

export default GroupLayer;
