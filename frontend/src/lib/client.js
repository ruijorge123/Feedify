/**
 * Client dashboard state.
 *
 * Same module-level cache + listener pattern as config.js / credits.js: the
 * counter, status and completeness are shown on several screens at once, and a
 * save on one screen has to move the badge on another without a reload.
 *
 * One endpoint (/client/overview) returns the whole picture, so there is exactly
 * one cache and one refresh path rather than four out-of-sync fetches.
 */

import { useEffect, useState } from "react";
import api from "@/lib/api";

let _cache = null;
let _inflight = null;
const _listeners = new Set();

function publish(data) {
  _cache = data;
  _listeners.forEach((fn) => { try { fn(data); } catch { /* ignore */ } });
}

export function getClientCache() {
  return _cache;
}

/** Fetch once; concurrent callers share the same request. */
export function fetchClient(force = false) {
  if (_cache && !force) return Promise.resolve(_cache);
  if (!_inflight) {
    _inflight = api
      .get("/client/overview")
      .then(({ data }) => { publish(data); return data; })
      .catch(() => null)
      .finally(() => { _inflight = null; });
  }
  return _inflight;
}

/** Replace the cache with a payload an endpoint already returned. */
export function setClient(data) {
  if (data && data.client) publish(data);
  return data;
}

export function refreshClient() {
  return fetchClient(true);
}

export function useClient() {
  const [data, setData] = useState(_cache);
  useEffect(() => {
    _listeners.add(setData);
    fetchClient().then((d) => d && setData(d));
    return () => { _listeners.delete(setData); };
  }, []);
  return data;
}

/** Clears on logout so the next account never sees the previous one's data. */
export function clearClient() {
  _cache = null;
}

// ── shared presentation ──────────────────────────────────────────────────────

export const STATUS_STYLE = {
  kuning: { label: "Menunggu approval", dot: "bg-amber-400", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  hijau: { label: "Aktif dikerjakan", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  selesai: { label: "Paket selesai", dot: "bg-brand-light", chip: "bg-brand-sand text-brand border-brand-sand" },
  nonaktif: { label: "Tidak aktif", dot: "bg-stone-400", chip: "bg-stone-100 text-stone-600 border-stone-200" },
};

export function statusStyle(status) {
  return STATUS_STYLE[status] || STATUS_STYLE.kuning;
}

/** The onboarding gates, in the order the client fills them.
 *  Products and their feed split are one step — splitting a basket that can
 *  still change on the next screen only produced totals that went stale. */
export const LANGKAH = [
  { key: "profil", label: "Data diri", path: "/settings" },
  { key: "brand_dna", label: "Brand DNA", path: "/brand-dna" },
  { key: "produk", label: "Produk", path: "/produk" },
  { key: "alokasi", label: "Pembagian feed", path: "/produk" },
];

/** First unfinished step, or null when everything is filled. */
export function langkahBerikutnya(kelengkapan) {
  if (!kelengkapan) return null;
  return LANGKAH.find((l) => !kelengkapan[l.key]) || null;
}
