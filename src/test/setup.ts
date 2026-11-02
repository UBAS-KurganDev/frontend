import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom has no layout engine. These browser APIs are used by cmdk and Radix.
if (typeof ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
}

if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.scrollIntoView = vi.fn();
}
