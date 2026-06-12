import * as Crypto from 'expo-crypto';

/** Generates a random UUID (v4) for new local records. */
export function generateId(): string {
  return Crypto.randomUUID();
}
