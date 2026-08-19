// ============================================================================
// Source: apps/mobile/src/lib/supabase.ts
// Version: 1.0.0 — 2026-08-21
// Why: Supabase client for React Native, with the session in secure storage.
// Env / Identity: Publishable (anon) key only. The service key must NEVER be
//      bundled into a mobile app — anything shipped to a device is readable.
//      Everything this client can do is bounded by RLS.
// ============================================================================
import "react-native-url-polyfill/auto";

import AsyncStorageStatic from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@goplaza/core/database";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
      "Copy apps/mobile/.env.example to apps/mobile/.env.local."
  );
}

/**
 * SecureStore is backed by the iOS keychain and Android keystore, which is
 * where an auth token belongs. It has a 2048-byte per-item limit, so long
 * sessions are chunked across keys.
 */
const CHUNK_SIZE = 1800;

const secureStorageAdapter = {
  async getItem(key: string) {
    const head = await SecureStore.getItemAsync(key);
    if (head === null) return null;
    if (!head.startsWith("__chunked__")) return head;

    const count = Number.parseInt(head.replace("__chunked__", ""), 10);
    let value = "";
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part === null) return null;
      value += part;
    }
    return value;
  },

  async setItem(key: string, value: string) {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const count = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(key, `__chunked__${count}`);
    for (let i = 0; i < count; i += 1) {
      await SecureStore.setItemAsync(
        `${key}.${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      );
    }
  },

  async removeItem(key: string) {
    const head = await SecureStore.getItemAsync(key);
    if (head?.startsWith("__chunked__")) {
      const count = Number.parseInt(head.replace("__chunked__", ""), 10);
      for (let i = 0; i < count; i += 1) {
        await SecureStore.deleteItemAsync(`${key}.${i}`);
      }
    }
    await SecureStore.deleteItemAsync(key);
  },
};

/**
 * Expo Router pre-renders the web build in Node, where there is no `window`.
 * AsyncStorage reaches for localStorage on web, so using it during SSR throws
 * `window is not defined` — and because supabase-js reads the stored session
 * as soon as the client is constructed, that crashed the whole dev server.
 */
const isServer = typeof window === "undefined";


const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

function pickStorage() {
  if (isServer) return noopStorage;
  // SecureStore has no web implementation; expo web falls back to AsyncStorage.
  return Platform.OS === "web" ? AsyncStorageStatic : secureStorageAdapter;
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: pickStorage(),
    // Nothing to persist or refresh while pre-rendering.
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    // There is no redirect URL to parse in a native app.
    detectSessionInUrl: false,
  },
});
