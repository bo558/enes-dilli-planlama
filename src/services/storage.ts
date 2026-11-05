import type { StateStorage } from 'zustand/middleware';

/**
 * Tarayıcıda yerel saklama. Gizli pencere veya engellenmiş site verisinde
 * uygulama bellekte çalışmaya devam eder. İleride API istemcisiyle değiştirilir.
 */
const memory = new Map<string, string>();

export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      memory.set(name, value);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      memory.delete(name);
    }
  },
};
