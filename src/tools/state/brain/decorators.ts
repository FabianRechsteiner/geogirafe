/**
 * A symbol used to mark properties that should be ignored during cloning operations.
 */
export const ignoreCloneSymbol = Symbol('brainIgnoreClone');

/**
 * A decorator function that marks a property of a class to be ignored during cloning.
 *
 * @param target - The target object (class prototype) where the property resides.
 * @param propertyKey - The key of the property to be ignored during cloning.
 */
export function BrainIgnoreClone(target: any, propertyKey: any): void {
  target[ignoreCloneSymbol] ??= [];
  target[ignoreCloneSymbol].push(propertyKey);
}
