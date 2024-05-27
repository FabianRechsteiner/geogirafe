import BaseLayer from './baselayer';

export type GroupLayerOptions = {
  isDefaultChecked?: boolean;
  disclaimer?: string;
  isDefaultExpanded?: boolean;
  isExclusiveGroup?: boolean;
};

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

  constructor(id: number, name: string, order: number, options?: GroupLayerOptions) {
    super(id, name, order, options);
    this.isExpanded = options?.isDefaultExpanded || false;
    this.isExclusiveGroup = options?.isExclusiveGroup ?? false;
  }

  clone(): GroupLayer {
    const options = {
      isDefaultChecked: this.isDefaultChecked,
      disclaimer: this.disclaimer,
      isDefaultExpanded: this.isExpanded,
      isExclusiveGroup: this.isExclusiveGroup
    };
    const clonedObject = new GroupLayer(this.id, this.name, this.order, options);
    clonedObject.activeState = this.activeState;

    // Clone childs
    for (const child of this.children) {
      const clonedChild = child.clone();
      clonedChild.parent = clonedObject;
      clonedObject.children.push(clonedChild);
    }

    return clonedObject;
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
