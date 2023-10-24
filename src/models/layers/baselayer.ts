import GroupLayer from "./layergroup";
import { v4 as uuidv4 } from 'uuid';

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

  public hasError: boolean = false;
  public errorMessage: string | null = null;

  public abstract activeState: string;
  public abstract get active(): boolean;
  public abstract get inactive(): boolean;

  public parent: GroupLayer | null = null;

  constructor(id: number, name: string, order: number, isDefaultChecked: boolean) {
    this.id = id;
    this.treeItemId = uuidv4();
    this.name = name;
    this.order = order;
    this.isDefaultChecked = isDefaultChecked;
  }
}

export default BaseLayer;