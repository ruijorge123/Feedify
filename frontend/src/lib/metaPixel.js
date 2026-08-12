// Meta Pixel event helper. The base pixel script (window.fbq) is loaded as a static
// <script> in public/index.html — NOT injected by React — per Meta's standard base code.
// This module only wraps calls to that already-loaded global so every custom event gets
// a unique eventID (for future server-side Conversions API deduplication) and never
// throws if the pixel failed to load (ad blockers, privacy browsers, etc.).

export function generateEventId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * fbq('track', eventName, params, { eventID }) — eventID is generated here so callers
 * never forget it. Returns the eventID used (null if fbq isn't available).
 */
export function fbTrack(eventName, params = {}) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return null;
  const eventId = generateEventId();
  window.fbq("track", eventName, params, { eventID: eventId });
  return eventId;
}
