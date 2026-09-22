/**
 * "Lihat sebagai klien" — the owner drives the real client app.
 *
 * Not an impersonation token: the session stays the owner's, and the server is
 * told which client's data to answer with via the same X-Client-Id header the
 * tools already use. That keeps one rule on the backend ("admins may read a
 * client's data") instead of minting credentials for someone else's account,
 * which would be a far larger door than looking at a screen needs.
 *
 * Separate from clientPicker on purpose: picking a client for the generators is
 * an everyday action, while stepping into their whole dashboard is a mode the
 * owner must be able to see they are in — and get out of.
 */

import { useEffect, useState } from "react";

const KEY = "feedify_view_as";

let _client = null;
const _listeners = new Set();

try {
  const raw = localStorage.getItem(KEY);
  if (raw) _client = JSON.parse(raw);
} catch { /* blocked storage — start out of the mode */ }

function publish() {
  _listeners.forEach((fn) => { try { fn(_client); } catch { /* ignore */ } });
}

/** Read by the axios interceptor; takes priority over the tools' picker. */
export function viewAsId() {
  return _client?.user_id || null;
}

export function getViewAs() {
  return _client;
}

export function enterViewAs(client) {
  _client = client || null;
  try {
    if (_client) localStorage.setItem(KEY, JSON.stringify(_client));
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
  publish();
}

export function exitViewAs() {
  enterViewAs(null);
}

export function useViewAs() {
  const [c, setC] = useState(_client);
  useEffect(() => {
    _listeners.add(setC);
    return () => { _listeners.delete(setC); };
  }, []);
  return c;
}
