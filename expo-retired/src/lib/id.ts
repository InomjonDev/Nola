import * as Crypto from "expo-crypto";

export function createId() {
  return Crypto.randomUUID();
}
