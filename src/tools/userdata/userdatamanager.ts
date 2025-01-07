import GirafeSingleton from '../../base/GirafeSingleton';
import {
  createObjectFromPath,
  deletePropertyByPath,
  getPropertyByPath,
  setPropertyByPath,
  mergeObjects
} from '../utils/pathUtils';

/**
 * Manages user data storage and retrieval across different storage sources.
 * The class supports localStorage and server as storage options (server-side implementation currently not available).
 * It provides functionality to set, get, save, and delete user data while maintaining the flexibility to target specific paths
 * within the user data object.
 */
class UserDataManager extends GirafeSingleton {
  // Using the full URL as storage key allows having separate user data for apps under the same base URL (e.g. demo apps)
  private readonly storageKey: string = window.location.origin + window.location.pathname;
  private source?: 'localStorage' | 'server';

  private readonly WARNING_UNKNOWN_SOURCE = 'User data source isn’t set';
  private readonly WARNING_NOT_IMPLEMENTED = 'Server-side functionality is not implemented yet';

  public setSource(source: string) {
    if (source === 'localStorage' || source === 'server') {
      this.source = source;
    } else {
      console.warn(`User data source "${source}" not known`);
    }
  }

  /**
   * Retrieves a specific part of the user data defined by the storage path.
   * @param storagePath path in the user data object to the requested value.
   * @param forceLocalStorage if true, reads user data from the local storage, ignoring the source.
   * @returns the partial user data object.
   */
  public getUserData(storagePath: string, forceLocalStorage = false): unknown {
    const fullUserDataObject = this.load(forceLocalStorage);
    const { found, parentObject, lastKey } = getPropertyByPath(fullUserDataObject, storagePath);
    return found && parentObject && lastKey ? parentObject[lastKey] : undefined;
  }

  /**
   * Saves user data to a specific path in the storage.
   * @param storagePath path in the user data object where the value is saved to.
   * @param newValue user data value to save.
   * @param forceLocalStorage if true, saves user data to the local storage, ignoring the source.
   */
  public saveUserData(storagePath: string, newValue: unknown, forceLocalStorage = false): void {
    let fullUserDataObject = this.load(forceLocalStorage);
    if (!getPropertyByPath(fullUserDataObject, storagePath).found) {
      // Object does not exist in user data yet, create it
      const newUserData: Record<string, unknown> = createObjectFromPath(storagePath);
      fullUserDataObject = mergeObjects(fullUserDataObject, newUserData);
    }
    if (setPropertyByPath(fullUserDataObject, storagePath, newValue)) {
      this.save(fullUserDataObject, forceLocalStorage);
    }
  }

  /**
   * Delete a specific part of the user data defined by the storage path.
   * @param storagePath path in the user data object that will be deleted.
   * @param forceLocalStorage if true, deletes user data in the local storage, ignoring the source.
   */
  public deleteUserData(storagePath: string, forceLocalStorage = false): void {
    const currentUserData = this.load(forceLocalStorage);
    deletePropertyByPath(currentUserData, storagePath);
    this.save(currentUserData, forceLocalStorage);
  }

  /**
   * Deletes all user data in storage.
   * @param forceLocalStorage Force deletion from local storage regardless of the currently set data source.
   */
  public deleteAllUserData(forceLocalStorage: boolean = false) {
    if (this.isInLocalStorage(forceLocalStorage)) {
      localStorage.removeItem(this.storageKey);
    } else if (this.source === 'server') {
      console.warn(this.WARNING_NOT_IMPLEMENTED);
    } else {
      console.warn(this.WARNING_UNKNOWN_SOURCE);
    }
  }

  /**
   * Helper: Load data from the user data storage.
   * @param forceLocalStorage forces loading data from local storage, independent of the specified source.
   * @returns the full user data object in the storage.
   */
  private load(forceLocalStorage: boolean): Record<string, unknown> {
    if (this.isInLocalStorage(forceLocalStorage)) {
      const storedUserData = localStorage.getItem(this.storageKey);
      return storedUserData ? JSON.parse(storedUserData) : {};
    } else if (this.source === 'server') {
      console.warn(this.WARNING_NOT_IMPLEMENTED);
    } else {
      console.warn(this.WARNING_UNKNOWN_SOURCE);
    }
    return {};
  }

  /**
   * Helper: Save user data to storage.
   * @param fullUserDataObject full user data object that is saved.
   * @param forceLocalStorage forces saving data to local storage, independent of the specified source.
   * @private
   */
  private save(fullUserDataObject: Record<string, unknown>, forceLocalStorage: boolean) {
    if (this.isInLocalStorage(forceLocalStorage)) {
      localStorage.setItem(this.storageKey, JSON.stringify(fullUserDataObject));
    } else if (this.source === 'server') {
      console.warn(this.WARNING_NOT_IMPLEMENTED);
    } else {
      console.warn(this.WARNING_UNKNOWN_SOURCE);
    }
  }

  /**
   * Helper: Determines if a particular operation should use the local browser storage.
   */
  private isInLocalStorage(forceLocalStorage: boolean) {
    return this.source === 'localStorage' || forceLocalStorage;
  }
}

export default UserDataManager;
