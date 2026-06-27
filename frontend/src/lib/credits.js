import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

let _listeners = [];
let _state = null;

export function useCredits() {
  const [credits, setCredits] = useState(_state);
  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/credits");
      _state = data;
      setCredits(data);
      _listeners.forEach((l) => l(data));
    } catch {}
  }, []);
  useEffect(() => {
    const listener = (s) => setCredits(s);
    _listeners.push(listener);
    if (!_state) refresh();
    else setCredits(_state);
    return () => { _listeners = _listeners.filter((l) => l !== listener); };
  }, [refresh]);
  return { credits, refresh, setCredits: (c) => { _state = c; _listeners.forEach((l) => l(c)); } };
}

export function notifyCreditsUpdate(c) {
  _state = c;
  _listeners.forEach((l) => l(c));
}

export function resetCreditsCache() {
  _state = null;
  _listeners.forEach((l) => l(null));
}
