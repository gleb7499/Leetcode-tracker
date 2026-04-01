export const storage = {
  get<T>(key: string, defaultValue: T | null = null): T | null {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },

  clear(): void {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  },

  has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  },
};
