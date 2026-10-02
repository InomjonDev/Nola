import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SECURE_CHUNK_SIZE = 700;

function manifestKey(key: string) {
  return `${key}.manifest`;
}

function chunkKey(key: string, index: number) {
  return `${key}.${index}`;
}

export const secureStorage = {
  async getItem(key: string) {
    return Platform.OS === "web" ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    return Platform.OS === "web" ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    return Platform.OS === "web" ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key);
  },
};

// Account data can exceed SecureStore's per-item limit, so native records are stored as
// encrypted chunks with a small manifest. Web keeps the existing browser storage model.
export const accountStorage = {
  async getItem(key: string) {
    if (Platform.OS === "web") return AsyncStorage.getItem(key);
    const rawManifest = await SecureStore.getItemAsync(manifestKey(key));
    if (!rawManifest) return AsyncStorage.getItem(key);
    try {
      const manifest = JSON.parse(rawManifest) as { chunks?: unknown };
      const count = typeof manifest.chunks === "number" && Number.isInteger(manifest.chunks) ? manifest.chunks : 0;
      if (count <= 0) return null;
      const chunks = await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))));
      return chunks.every((chunk) => chunk !== null) ? chunks.join("") : null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === "web") return AsyncStorage.setItem(key, value);
    const previous = await SecureStore.getItemAsync(manifestKey(key));
    let previousCount = 0;
    try {
      const manifest = previous ? JSON.parse(previous) as { chunks?: unknown } : null;
      previousCount = manifest && typeof manifest.chunks === "number" ? manifest.chunks : 0;
    } catch {
      previousCount = 0;
    }
    const characters = Array.from(value);
    const chunks = Array.from({ length: Math.ceil(characters.length / SECURE_CHUNK_SIZE) || 1 }, (_, index) => characters.slice(index * SECURE_CHUNK_SIZE, (index + 1) * SECURE_CHUNK_SIZE).join(""));
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk)));
    await Promise.all(Array.from({ length: Math.max(0, previousCount - chunks.length) }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, chunks.length + index))));
    await SecureStore.setItemAsync(manifestKey(key), JSON.stringify({ chunks: chunks.length }));
    await AsyncStorage.removeItem(key);
  },
  async removeItem(key: string) {
    if (Platform.OS === "web") return AsyncStorage.removeItem(key);
    const rawManifest = await SecureStore.getItemAsync(manifestKey(key));
    let count = 0;
    try {
      const manifest = rawManifest ? JSON.parse(rawManifest) as { chunks?: unknown } : null;
      count = manifest && typeof manifest.chunks === "number" ? manifest.chunks : 0;
    } catch {
      count = 0;
    }
    await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, index))));
    await SecureStore.deleteItemAsync(manifestKey(key));
    await AsyncStorage.removeItem(key);
  },
};
