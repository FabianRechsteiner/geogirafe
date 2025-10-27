export default interface ISessionManager {
  beginSession(): void;
  saveStateToSession(): void;
  hasState(): boolean;
  setStateFromSession(): boolean;
}
