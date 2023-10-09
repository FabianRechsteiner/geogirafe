import GroupLayer from "./layergroup";
import { v4 as uuidv4 } from 'uuid';

abstract class BaseLayer {
    
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

    setError(error: string) {
        this.hasError = true;
        this.errorMessage = error;
        console.warn(this.errorMessage);
    }

    unsetError() {
        this.hasError = false;
        this.errorMessage = null;
    }
}

export default BaseLayer;