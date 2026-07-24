// Module-level pub-sub so any page (e.g. AdminPage's "Lihat Tour" button) can force-open
// the single ProductTour instance living in AppShell — without mounting a second tour
// instance that would unmount whenever the page navigates away (e.g. tour crossing
// from /admin to /dashboard for steps that live on the dashboard).
const _listeners = new Set();

export function triggerTour() {
  _listeners.forEach((fn) => fn());
}

export function subscribeTourTrigger(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
