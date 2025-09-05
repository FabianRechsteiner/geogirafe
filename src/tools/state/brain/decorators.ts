/**
 * A symbol used to mark properties that should be ignored during cloning operations.
 */
export const ignoreCloneSymbol = Symbol('brainIgnoreClone');

/**
 * A symbol used to mark properties that should be serializable.
 */
export const serializeSymbol = Symbol('brainSerialize');

/**
 * A decorator function that marks a property of a class to be ignored during cloning.
 *
 * @param target - The target object (class prototype) where the property resides.
 * @param propertyKey - The key of the property to be ignored during cloning.
 */
export function BrainIgnoreClone(target: any, propertyKey: string | symbol): void {
  target[ignoreCloneSymbol] ??= [];
  target[ignoreCloneSymbol].push(propertyKey);
}

/**
 * A decorator function that marks a property of a class to be serializable.
 *
 * @param target - The target object (class prototype) where the property resides.
 * @param propertyKey - The key of the property to be ignored during cloning.
 */
export function BrainSerialize(target: any, propertyKey: string | symbol): void {
  target[serializeSymbol] ??= [];
  target[serializeSymbol].push(propertyKey);
}

export interface IBrainSerializable {
  isBrainSerializable: boolean;
}

export function isBrainSerializable(obj: any): obj is IBrainSerializable {
  return (<IBrainSerializable>obj)?.isBrainSerializable !== undefined;
}
