// SPDX-License-Identifier: Apache-2.0
export default interface ISessionManager {
  beginSession(): void;
  saveStateToSession(): void;
  hasState(): boolean;
  setStateFromSession(): boolean;
}
