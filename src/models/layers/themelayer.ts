import BaseLayer from './baselayer';
import { Coordinate } from 'ol/coordinate';

export type ThemeLayerOptions = {
  isDefaultChecked?: boolean;
  disclaimer?: string;
  metadataUrl?: string;
  isDefaultExpanded?: boolean;
  isExclusiveTheme?: boolean;
};

class ThemeLayer extends BaseLayer {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public isExclusiveTheme: boolean;
  public isExpanded: boolean;
  public activeState: 'on' | 'off' | 'semi' = 'off';
  public icon?: string;
  public location?: Coordinate;
  public zoom?: number;

  public children: BaseLayer[] = [];

  public constructor(id: number, name: string, order: number, icon?: string, options?: ThemeLayerOptions) {
    super(id, name, order, options);
    this.isExpanded = options?.isDefaultExpanded || true;
    this.isExclusiveTheme = options?.isExclusiveTheme ?? false;
    this.icon = icon;
  }

  public clone(): ThemeLayer {
    const options = {
      disclaimer: this.disclaimer,
      isDefaultExpanded: this.isExpanded
    };
    const clonedObject = new ThemeLayer(this.id, this.name, this.order, this.icon, options);
    clonedObject.activeState = this.activeState;

    // Clone children
    for (const child of this.children) {
      try {
        const clonedChild = child.clone();
        clonedChild.parent = clonedObject;
        clonedObject.children.push(clonedChild);
      } catch {
        console.warn(`Cloning child ${child.name} of theme ${this.name} ins't supported`);
      }
    }

    return clonedObject;
  }

  public get active() {
    return this.activeState === 'on';
  }

  public get inactive() {
    return this.activeState === 'off';
  }

  public get semiActive() {
    return this.activeState === 'semi';
  }
}

export default ThemeLayer;
