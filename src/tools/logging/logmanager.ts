import GirafeSingleton from '../../base/GirafeSingleton';

export default class LogManager extends GirafeSingleton {
  defaultDebug: typeof console.debug = console.debug;
  defaultLog: typeof console.log = console.log;
  defaultInfo: typeof console.info = console.info;
  defaultWarn: typeof console.warn = console.warn;
  defaultError: typeof console.error = console.error;

  initLogging() {
    console.debug = this.debug.bind(this);
    console.log = this.log.bind(this);
    console.info = this.info.bind(this);
    console.warn = this.warn.bind(this);
    console.error = this.error.bind(this);
  }

  /**
   * Write log to output if the current loglevel is debug, info, warn or error
   * @returns true if the log was written, false instead
   */
  private debug(message: unknown, ...optionalParams: unknown[]) {
    if (this.context.configManager.Config.general.logLevel === 'debug') {
      this.defaultDebug(message, ...optionalParams);
      return true;
    }
    return false;
  }

  /**
   * Write log to output if the current loglevel is info, warn or error
   * @returns true if the log was written, false instead
   */
  private log(message: unknown, ...optionalParams: unknown[]) {
    if (
      this.context.configManager.Config.general.logLevel === 'debug' ||
      this.context.configManager.Config.general.logLevel === 'info'
    ) {
      this.defaultLog(message, ...optionalParams);
      return true;
    }
    return false;
  }

  /**
   * Write log to output if the current loglevel is info, warn or error
   * @returns true if the log was written, false instead
   */
  private info(message: unknown, ...optionalParams: unknown[]) {
    if (
      this.context.configManager.Config.general.logLevel === 'debug' ||
      this.context.configManager.Config.general.logLevel === 'info'
    ) {
      this.defaultInfo(message, ...optionalParams);
      return true;
    }
    return false;
  }

  /**
   * Write log to output if the current loglevel is warn or error
   * @returns true if the log was written, false instead
   */
  private warn(message: unknown, ...optionalParams: unknown[]) {
    if (
      this.context.configManager.Config.general.logLevel === 'debug' ||
      this.context.configManager.Config.general.logLevel === 'info' ||
      this.context.configManager.Config.general.logLevel === 'warn'
    ) {
      this.defaultWarn(message, ...optionalParams);
      return true;
    }
    return false;
  }

  /**
   * Write log to output if the current loglevel is error
   * @returns true if the log was written, false instead
   */
  private error(message: unknown, ...optionalParams: unknown[]) {
    this.defaultError(message, ...optionalParams);
    return true;
  }
}
