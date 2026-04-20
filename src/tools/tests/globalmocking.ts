// SPDX-License-Identifier: Apache-2.0
import { vi } from 'vitest';

// Mock the ResizeObserver
const ResizeObserverMock = vi.fn(
  class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
);

// Stub the global ResizeObserver
vi.stubGlobal('ResizeObserver', ResizeObserverMock);
