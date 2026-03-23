// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  it('should call the function after the specified wait time', () => {
    const func = vi.fn();
    const debouncedFunc = debounce(func, 1000);

    debouncedFunc();

    // Function should not be called immediately
    expect(func).not.toHaveBeenCalled();

    // Fast-forward time
    vi.advanceTimersByTime(1000);

    // Function should be called after the wait time
    expect(func).toHaveBeenCalled();
  });

  it('should reset the timer if called again before wait time elapses', () => {
    const func = vi.fn();
    const debouncedFunc = debounce(func, 1000);

    debouncedFunc();
    vi.advanceTimersByTime(500);
    debouncedFunc();
    vi.advanceTimersByTime(500);

    // Function should not be called yet
    expect(func).not.toHaveBeenCalled();

    // Fast-forward remaining time
    vi.advanceTimersByTime(500);

    // Function should be called after the total wait time
    expect(func).toHaveBeenCalled();
  });

  it('should call the function with the correct arguments and context', () => {
    const func = vi.fn();
    const debouncedFunc = debounce(func, 1000);
    const context = { value: 42 };

    debouncedFunc.call(context, 'arg1', 'arg2');
    vi.advanceTimersByTime(1000);

    // Function should be called with the correct arguments and context
    expect(func).toHaveBeenCalledWith('arg1', 'arg2');
    expect(func).toHaveBeenCalledTimes(1);
    expect(func.mock.instances[0]).toBe(context);
  });

  it('should handle multiple quick calls correctly', () => {
    const func = vi.fn();
    const debouncedFunc = debounce(func, 1000);

    for (let i = 0; i < 10; i++) {
      debouncedFunc();
    }
    vi.advanceTimersByTime(1000);

    // Function should be called only once
    expect(func).toHaveBeenCalledTimes(1);
  });
});
