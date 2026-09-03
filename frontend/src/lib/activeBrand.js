// Active brand — shared, cached once per session, same module-level cache + listener
// pattern as config.js / credits.js / menuLock.js.
//
// Every generator builds its prompt from whichever brand profile is active server-side,
// so when a user owns several brands the one that's active silently decides the colors,
// personality and tone of everything they produce. This module exists so each generator
// page can SHOW which brand that is, instead of the user finding out only after the
// output comes back in another brand's palette.

import { useEffect, useState } from "react";
import api from "@/lib/api";

let _cache = null;
let _inflight = null;
const _listeners = new Set();

function _notify() {
  _listeners.forEach((fn) => {
    try { fn(_cache); } catch { /* a broken listener must not break the others */ }
  });
}

export function fetchActiveBrand() {
  if (_cache) return Promise.resolve(_cache);
  if (!_inflight) {
    _inflight = api
      .get("/brand-profile")
      .then(({ data }) => { _cache = data || null; _notify(); return _cache; })
      .catch(() => null)
      .finally(() => { _inflight = null; });
  }
  return _inflight;
}

/** Call after switching or editing brands so every mounted consumer re-reads it. */
export function invalidateActiveBrand() {
  _cache = null;
  _notify();
  return fetchActiveBrand();
}

/** Clear on logout — the next user must not inherit this one's brand. */
export function resetActiveBrandCache() {
  _cache = null;
  _inflight = null;
}

// SettingsPage already announces brand switches/edits with this event (AppShell listens
// to it too), so hooking it here keeps every chip in sync without those pages needing to
// know this module exists.
if (typeof window !== "undefined") {
  window.addEventListener("brand-updated", () => { invalidateActiveBrand(); });
}

export function useActiveBrand() {
  const [brand, setBrand] = useState(_cache);
  useEffect(() => {
    _listeners.add(setBrand);
    fetchActiveBrand().then((b) => setBrand(b));
    return () => { _listeners.delete(setBrand); };
  }, []);
  return brand;
}
