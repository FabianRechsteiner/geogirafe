// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import MockHelper from '../tests/mockhelper';
import ConfigManager from '../configuration/configmanager';
import IGirafeContext from '../context/icontext';

describe('LogManager', () => {
  let configManager: ConfigManager;
  let context: IGirafeContext;

  beforeAll(() => {
    context = MockHelper.startMocking();
    configManager = context.configManager;
    context.logManager.initLogging();
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  it('should output debug log at debug level only', () => {
    // Debug
    configManager.Config.general.logLevel = 'debug';
    let str = 'Hello, Giraffe!';
    let written = console.debug(str);
    expect(written).toBe(true);
    // Info
    configManager.Config.general.logLevel = 'info';
    written = console.debug(str);
    expect(written).toBe(false);
    // Warn
    configManager.Config.general.logLevel = 'warn';
    written = console.debug(str);
    expect(written).toBe(false);
    // Error
    configManager.Config.general.logLevel = 'error';
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
    written = console.info(str);
    expect(written).toBe(true);
    // Warn
    configManager.Config.general.logLevel = 'warn';
    written = console.info(str);
    expect(written).toBe(false);
    // Error
    configManager.Config.general.logLevel = 'error';
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
    written = console.log(str);
    expect(written).toBe(true);
    // Warn
    configManager.Config.general.logLevel = 'warn';
    written = console.log(str);
    expect(written).toBe(false);
    // Error
    configManager.Config.general.logLevel = 'error';
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
    written = console.warn(str);
    expect(written).toBe(true);
    // Warn
    configManager.Config.general.logLevel = 'warn';
    written = console.warn(str);
    expect(written).toBe(true);
    // Error
    configManager.Config.general.logLevel = 'error';
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
    written = console.error(str);
    expect(written).toBe(true);
    // Warn
    configManager.Config.general.logLevel = 'warn';
    written = console.error(str);
    expect(written).toBe(true);
    // Error
    configManager.Config.general.logLevel = 'error';
    written = console.error(str);
    expect(written).toBe(true);
  });

  it('should output assert log at any level', () => {
    // Debug
    configManager.Config.general.logLevel = 'debug';
    let str = 'Hello, Giraffe!';
    let written = console.assert(true, str);
    expect(written).toBe(false);
    written = console.assert(false, str);
    expect(written).toBe(true);
    // Info
    configManager.Config.general.logLevel = 'info';
    written = console.assert(true, str);
    expect(written).toBe(false);
    written = console.assert(false, str);
    expect(written).toBe(true);
    // Warn
    configManager.Config.general.logLevel = 'warn';
    written = console.assert(true, str);
    expect(written).toBe(false);
    written = console.assert(false, str);
    expect(written).toBe(true);
    // Error
    configManager.Config.general.logLevel = 'error';
    written = console.assert(true, str);
    expect(written).toBe(false);
    written = console.assert(false, str);
    expect(written).toBe(true);
  });
});
