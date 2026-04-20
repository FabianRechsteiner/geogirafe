// SPDX-License-Identifier: Apache-2.0
import { isBrainSerializable, serializeSymbol } from './decorators';

export type Constructor<T> = new (...args: any[]) => T;

export interface IBrainSerializer<T> {
  brainSerialize(obj: T): string;
  brainDeserialize(str: string): void;
}

export default class BrainSerializer<T extends Record<string | symbol, any>> {
  private readonly registry = new Map<Constructor<object>, IBrainSerializer<object>>();

  public addSerializer(type: Constructor<object>, serializerData: IBrainSerializer<object>): void {
    this.registry.set(type, serializerData);
  }

  private getSerializer(obj: T): IBrainSerializer<object> | undefined {
    for (const [type, data] of this.registry.entries()) {
      if (obj instanceof type) {
        return data;
      }
    }
    return undefined;
  }

  public serialize(state: T): string {
    const serializedState = {} as Record<string, any>;
    const keys = Object.keys(state).filter(
      (key) => !key.startsWith('_') && (state[serializeSymbol]?.includes(key) || isBrainSerializable(state[key]))
    );
    for (const key of keys) {
      const serializer = this.getSerializer(state[key]);
      if (serializer) {
        console.debug(`Serializing ${key} with custom serializer`);
        serializedState[key] = serializer.brainSerialize(state[key]);
      } else {
        console.debug(`Serializing ${key} with default serializer`);
        serializedState[key] = JSON.stringify(state[key]);
      }
    }

    return JSON.stringify(serializedState);
  }

  public deserialize(stringSerializedState: string, state: Record<string | symbol, any>) {
    const serializedState = JSON.parse(stringSerializedState);
    const keys = Object.keys(state).filter(
      (key) => !key.startsWith('_') && (state[serializeSymbol]?.includes(key) || isBrainSerializable(state[key]))
    );
    for (const key of keys) {
      if (Object.hasOwn(serializedState, key)) {
        const serializer = this.getSerializer(state[key]);
        if (serializer) {
          console.debug(`Deserializing ${key} with custom serializer`);
          serializer.brainDeserialize(serializedState[key]);
        } else {
          console.debug(`Deserializing ${key} with default serializer`);
          state[key] = JSON.parse(serializedState[key]);
        }
      }
    }
  }
}
