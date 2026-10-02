function storageAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const secureStorage = {
  async getItem(key: string) {
    return storageAvailable() ? window.localStorage.getItem(key) : null;
  },
  async setItem(key: string, value: string) {
    if (storageAvailable()) window.localStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    if (storageAvailable()) window.localStorage.removeItem(key);
  },
};

export const accountStorage = secureStorage;
