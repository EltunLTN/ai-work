"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Persisted student data is read after hydration, so server and client markup agree.
export function useBrowserReady() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
