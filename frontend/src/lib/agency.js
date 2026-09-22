// Agency packages, prices and slot availability — fetched once per session from
// GET /api/agency/config and shared through the same module-level cache + listener
// pattern as config.js / credits.js.
//
// The landing page must never hardcode a price or a slot count: the owner edits
// those from the Admin Panel, and a wrong number on a public sales page is worse
// than a slow one. Everything here falls back to null so the UI can show a skeleton
// instead of inventing figures.

import { useEffect, useState } from "react";
import api from "@/lib/api";

let _cache = null;
let _inflight = null;
const _listeners = new Set();

export function fetchAgencyConfig() {
  if (_cache) return Promise.resolve(_cache);
  if (!_inflight) {
    _inflight = api
      .get("/agency/config")
      .then(({ data }) => {
        _cache = data || null;
        _listeners.forEach((fn) => { try { fn(_cache); } catch { /* ignore */ } });
        return _cache;
      })
      .catch(() => null)
      .finally(() => { _inflight = null; });
  }
  return _inflight;
}

export function useAgencyConfig() {
  const [cfg, setCfg] = useState(_cache);
  useEffect(() => {
    _listeners.add(setCfg);
    fetchAgencyConfig().then((c) => setCfg(c));
    return () => { _listeners.delete(setCfg); };
  }, []);
  return cfg;
}

export function formatRupiah(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

/** wa.me link with an optional prefilled message. */
export function waLink(number, message = "") {
  const n = String(number || "").replace(/\D/g, "");
  return `https://wa.me/${n}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
