// Setup testing environment
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Provide basic localStorage mock if missing
if (typeof window !== 'undefined' && !window.localStorage) {
  let store: Record<string, string> = {};
  window.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (i: number) => Object.keys(store)[i] || null,
    length: Object.keys(store).length,
  };
}

// Window scrollTo mock
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
}
