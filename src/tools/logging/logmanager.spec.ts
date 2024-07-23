import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import MockHelper from '../tests/mockhelper';
import LogManager from './logmanager';
import ConfigManager from '../configuration/configmanager';

describe('LogManager', () => {
  let configManager: ConfigManager;

  beforeAll(() => {
    MockHelper.startMocking();
    configManager = ConfigManager.getInstance();
    LogManager.getInstance().initLogging();
  });

  afterAll(() => {
    MockHelper.stopMocking();
  });

  it('should output debug log at debug level only', () => {
    // Debug
    configManager.Config.general.logLevel = 'debug';
    let str = 'Hello, Giraffe!';
    let written = console.debug(str);
    expect(written).toBe(true);
    // Info
    configManager.Config.general.logLevel = 'info';
    str = 'Hello, Giraffe!';
    written = console.debug(str);
    expect(written).toBe(false);
    // Warn
    configManager.Config.general.logLevel = 'warn';
    str = 'Hello, Giraffe!';
    written = console.debug(str);
    expect(written).toBe(false);
    // Error
    configManager.Config.general.logLevel = 'error';
    str = 'Hello, Giraffe!';
    written = console.debug(str);
    expect(written).toBe(false);
  });

  it('should output info log at debug and info level only', () => {
    // Debug
    configManager.Config.general.logLevel = 'debug';
    let str = 'Hello, Giraffe!';
    let written = console.info(str);
    expect(written).toBe(true);
    // Info
    configManager.Config.general.logLevel = 'info';
    str = 'Hello, Giraffe!';
    written = console.info(str);
    expect(written).toBe(true);
    // Warn
    configManager.Config.general.logLevel = 'warn';
    str = 'Hello, Giraffe!';
    written = console.info(str);
    expect(written).toBe(false);
    // Error
    configManager.Config.general.logLevel = 'error';
    str = 'Hello, Giraffe!';
    written = console.info(str);
    expect(written).toBe(false);
  });

  it('should output log log at debug and info level only', () => {
    // Debug
    configManager.Config.general.logLevel = 'debug';
    let str = 'Hello, Giraffe!';
    let written = console.log(str);
    expect(written).toBe(true);
    // Info
    configManager.Config.general.logLevel = 'info';
    str = 'Hello, Giraffe!';
    written = console.log(str);
    expect(written).toBe(true);
    // Warn
    configManager.Config.general.logLevel = 'warn';
    str = 'Hello, Giraffe!';
    written = console.log(str);
    expect(written).toBe(false);
    // Error
    configManager.Config.general.logLevel = 'error';
    str = 'Hello, Giraffe!';
    written = console.log(str);
    expect(written).toBe(false);
  });

  it('should output warn log at debug, info and warn level only', () => {
    // Debug
    configManager.Config.general.logLevel = 'debug';
    let str = 'Hello, Giraffe!';
    let written = console.warn(str);
    expect(written).toBe(true);
    // Info
    configManager.Config.general.logLevel = 'info';
    str = 'Hello, Giraffe!';
    written = console.warn(str);
    expect(written).toBe(true);
    // Warn
    configManager.Config.general.logLevel = 'warn';
    str = 'Hello, Giraffe!';
    written = console.warn(str);
    expect(written).toBe(true);
    // Error
    configManager.Config.general.logLevel = 'error';
    str = 'Hello, Giraffe!';
    written = console.warn(str);
    expect(written).toBe(false);
  });

  it('should output error log at any level', () => {
    // Debug
    configManager.Config.general.logLevel = 'debug';
    let str = 'Hello, Giraffe!';
    let written = console.error(str);
    expect(written).toBe(true);
    // Info
    configManager.Config.general.logLevel = 'info';
    str = 'Hello, Giraffe!';
    written = console.error(str);
    expect(written).toBe(true);
    // Warn
    configManager.Config.general.logLevel = 'warn';
    str = 'Hello, Giraffe!';
    written = console.error(str);
    expect(written).toBe(true);
    // Error
    configManager.Config.general.logLevel = 'error';
    str = 'Hello, Giraffe!';
    written = console.error(str);
    expect(written).toBe(true);
  });
});
