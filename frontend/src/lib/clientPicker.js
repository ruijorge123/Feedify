/**
 * Which client the owner is currently producing for.
 *
 * Every generator reads the selected client's Brand DNA and products instead of
 * the owner's own. The choice travels as an `X-Client-Id` header on every API
 * call (see lib/api.js), so no generator page needs to know this exists — they
 * keep calling the same endpoints and simply receive the right brand.
 *
 * Persisted because the owner works through one client's whole batch across many
 * screens; losing the selection on a page reload would mean producing a carousel
 * against the wrong brand without noticing.
 */

import { useEffect, useState } from "react";
import api from "@/lib/api";

const KEY = "feedify_active_client";

let _selected = null;      // { user_id, name, nickname } | null
let _list = null;          // cached roster
const _listeners = new Set();

try {
  const raw = localStorage.getItem(KEY);
  if (raw) _selected = JSON.parse(raw);
} catch { /* private mode, blocked storage — just start empty */ }

function publish() {
  _listeners.forEach((fn) => { try { fn(_selected); } catch { /* ignore */ } });
}

/** Read by the axios interceptor on every request. */
export function activeClientId() {
  return _selected?.user_id || null;
}

export function getActiveClient() {
  return _selected;
}

export function setActiveClient(client) {
  _selected = client || null;
  try {
    if (_selected) localStorage.setItem(KEY, JSON.stringify(_selected));
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
  publish();
}

export function useActiveClient() {
  const [c, setC] = useState(_selected);
  useEffect(() => {
    _listeners.add(setC);
    return () => { _listeners.delete(setC); };
  }, []);
  return c;
}

/** Roster for the picker. Cached — it changes rarely and is read on every tool page. */
export function fetchClientList(force = false) {
  if (_list && !force) return Promise.resolve(_list);
  return api
    .get("/admin/clients")
    .then(({ data }) => {
      _list = (data || []).map((c) => ({
        user_id: c.user_id,
        name: c.name || c.email,
        nickname: c.nickname,
        status: c.status,
        counter: c.counter,
        total_feeds: c.total_feeds,
        lengkap: c.kelengkapan?.lengkap,
      }));
      return _list;
    })
    .catch(() => []);
}

export function useClientList() {
  const [list, setList] = useState(_list);
  useEffect(() => { fetchClientList().then(setList); }, []);
  return list;
}
