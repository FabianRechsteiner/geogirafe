// SPDX-License-Identifier: Apache-2.0
import { BrainIgnoreClone } from '../../tools/state/brain/decorators';
import GroupLayer from './grouplayer';
import ThemeLayer from './themelayer';
import { v4 as uuidv4 } from 'uuid';

type BaseLayerOptions = {
  isDefaultChecked?: boolean;
  disclaimer?: string;
  metadataUrl?: string;
};

abstract class BaseLayer {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public id: number;
  public treeItemId: string;
  public name: string;
  public order: number;
  public isDefaultChecked: boolean;
  public disclaimer?: string;
  public metadataUrl?: string;
  public isVisible: boolean = true;
  // The pinned state will bring layers to the top of their parent, independent of their order.
  // Additionally, pinned themes will stay in the tree when switching between themes or emptying the tree.
  public isPinned: boolean = false;
  public isRemovable: boolean = true;

  public hasError: boolean = false;
  public errorMessage: string | null = null;
  public get hasMetadata(): boolean {
    return this.metadataUrl !== undefined;
  }

  public isHighlighted: boolean = false;

  public abstract activeState: string;
  public abstract get active(): boolean;
  public abstract get inactive(): boolean;
  public abstract clone(): BaseLayer;

  @BrainIgnoreClone
  public parent?: ThemeLayer | GroupLayer;

  public constructor(id: number, name: string, order: number, options?: BaseLayerOptions) {
    this.id = id;
    this.treeItemId = uuidv4();
    this.name = name;
    this.order = order;
    this.isDefaultChecked = options?.isDefaultChecked || false;
    this.disclaimer = options?.disclaimer;
    this.metadataUrl = options?.metadataUrl;
  }

  /**
   * @returns the name of the class to facilitate the identification
   * of subclasses, even in Proxy objects.
   */
  public get className() {
    return this.constructor.name;
  }
}

export default BaseLayer;
