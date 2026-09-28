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
let _cacheFor = null;   // whose brand _cache holds — see whoseBrand()
let _inflight = null;
const _listeners = new Set();

/**
 * Whose brand the server will answer with: the same X-Client-Id rule lib/api.js
 * applies (view-as first, then the client picker), else the account's own.
 *
 * The cache is keyed by this. Without the key, picking another client or a
 * Brand Saya entry kept showing the previous brand's name on every generator
 * page for the rest of the session, while the prompts themselves already used
 * the new one.
 */
export function whoseBrand() {
  try {
    const raw = localStorage.getItem("feedify_view_as")
             || localStorage.getItem("feedify_active_client");
    return (raw && JSON.parse(raw)?.user_id) || "self";
  } catch {
    return "self";
  }
}

function _notify() {
  _listeners.forEach((fn) => {
    try { fn(_cache); } catch { /* a broken listener must not break the others */ }
  });
}

export function fetchActiveBrand() {
  const who = whoseBrand();
  if (_cache && _cacheFor === who) return Promise.resolve(_cache);
  if (_cacheFor !== who) {
    // Selection changed since the last read: drop the old brand right away so
    // no page shows it while the new one loads.
    _cache = null;
    _cacheFor = who;
    _inflight = null;
    _notify();
  }
  if (!_inflight) {
    const req = api
      .get("/brand-profile")
      .then(({ data }) => {
        // A slower answer for a previous selection must not overwrite this one.
        if (whoseBrand() === who) { _cache = data || null; _notify(); }
        return data || null;
      })
      .catch(() => null)
      .finally(() => { if (_inflight === req) _inflight = null; });
    _inflight = req;
  }
  return _inflight;
}

/** Call after switching or editing brands so every mounted consumer re-reads it. */
export function invalidateActiveBrand() {
  _cache = null;
  _cacheFor = null;
  _notify();
  return fetchActiveBrand();
}

/** Clear on logout — the next user must not inherit this one's brand. */
export function resetActiveBrandCache() {
  _cache = null;
  _cacheFor = null;
  _inflight = null;
}

// SettingsPage already announces brand switches/edits with this event (AppShell listens
// to it too), so hooking it here keeps every chip in sync without those pages needing to
// know this module exists.
if (typeof window !== "undefined") {
  window.addEventListener("brand-updated", () => { invalidateActiveBrand(); });
}

export function useActiveBrand() {
  // Only trust the cache on first paint if it belongs to the current selection.
  const [brand, setBrand] = useState(() => (_cacheFor === whoseBrand() ? _cache : null));
  useEffect(() => {
    _listeners.add(setBrand);
    fetchActiveBrand().then((b) => setBrand(b));
    return () => { _listeners.delete(setBrand); };
  }, []);
  return brand;
}
