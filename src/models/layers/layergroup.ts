import BaseLayer from "./baselayer";

class GroupLayer extends BaseLayer {

  public isExclusiveGroup: boolean;
  public isExpanded: boolean;
  public activeState: 'on' | 'off' | 'semi' = 'off';

  children: BaseLayer[] = [];

  constructor(elem: any, order: number) {
    const isDefaultChecked = elem.metadata?.isChecked ?? false;
    super(elem.id, elem.name, order, isDefaultChecked);
    
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