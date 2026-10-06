// Browsers already provide durable storage; loading expo-sqlite here crashes its web worker.
export const authStorage = globalThis.localStorage;
