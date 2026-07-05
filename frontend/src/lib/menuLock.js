import { useEffect, useState } from "react";
import api from "@/lib/api";

let _cache = null;
const _listeners = new Set();

export function invalidateMenuLockCache() {
  _cache = null;
  _listeners.forEach((fn) => fn());
}

export function useMenuLockStatus() {
  const [status, setStatus] = useState(_cache);

  useEffect(() => {
    const fetch = () => {
      api.get("/menu-lockdown-status")
        .then(({ data }) => { _cache = data; setStatus(data); })
        .catch(() => setStatus({}));
    };

    if (!_cache) fetch();

    _listeners.add(fetch);
    return () => _listeners.delete(fetch);
  }, []);

  return status || _cache || {};
}

export function menuMode(status, menuKey) {
  return status?.[menuKey]?.mode || "active";
}
