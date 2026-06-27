import { useEffect, useState } from "react";
import api from "@/lib/api";

let _cache = null;

export function useMenuLockStatus() {
  const [status, setStatus] = useState(_cache);
  useEffect(() => {
    if (_cache) return;
    api.get("/menu-lockdown-status")
      .then(({ data }) => { _cache = data; setStatus(data); })
      .catch(() => setStatus({}));
  }, []);
  return status || _cache || {};
}

export function menuMode(status, menuKey) {
  return status?.[menuKey]?.mode || "active";
}
