import IGirafeContext from '../tools/context/icontext';

// TODO REG: Transform to interface
class GirafeSingleton {
  protected readonly context;

  constructor(context: IGirafeContext) {
    this.context = context;
  }

  public initializeSingleton(): void {
    /*
     * This method does nothing by default, but will be called by the context when creating the singleton
     * (This prevent overriding the constructor in every songleton and creating a strong dependency to the context object)
     */
  }

  isNullOrUndefinedOrBlank(val: unknown) {
    return val === undefined || val === null || val === '';
  }
}

export default GirafeSingleton;
