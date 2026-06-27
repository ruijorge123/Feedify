import { useEffect, useState } from "react";
import api from "@/lib/api";

let _cache = null;

export function useConfig() {
  const [cfg, setCfg] = useState(_cache);
  useEffect(() => {
    if (_cache) return;
    api.get("/config").then(({ data }) => { _cache = data; setCfg(data); }).catch(() => {});
  }, []);
  return cfg;
}

export async function fetchConfig() {
  if (_cache) return _cache;
  const { data } = await api.get("/config");
  _cache = data;
  return data;
}

export function resetConfigCache() {
  _cache = null;
}
