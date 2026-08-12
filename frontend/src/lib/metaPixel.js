// Meta Pixel event helper. The base pixel script (window.fbq) is loaded as a static
// <script> in public/index.html — NOT injected by React — per Meta's standard base code.
// This module only wraps calls to that already-loaded global so every event carries an
// eventID and never throws if the pixel failed to load (ad blockers, privacy browsers, etc.).

export function generateEventId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * fbq('track', eventName, params, { eventID }).
 *
 * - Pass `eventId` explicitly for events that can only happen once per entity
 *   (Purchase → `purchase_${order.id}`, CompleteRegistration → `signup_${user.id}`,
 *   StartTrial → `trial_${user.id}`) — a deterministic ID is what lets Meta recognize
 *   a repeated/duplicate fire (page refresh, two dashboards both reporting a user's
 *   first-ever generation, etc.) as THE SAME event and not double-count it. This is
 *   also what future server-side Conversions API dedup relies on — a random ID here
 *   would defeat that entirely.
 * - Omit it (default) for events that are legitimately allowed to repeat (PageView,
 *   ViewContent, InitiateCheckout) — a fresh random ID is generated per call.
 */
export function fbTrack(eventName, params = {}, eventId = null) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return null;
  const id = eventId || generateEventId();
  window.fbq("track", eventName, params, { eventID: id });
  return id;
}

/**
 * Reads the current user id from AuthContext's own localStorage cache ("feedify_user",
 * seeded on every login/register/refresh — see context/AuthContext.jsx). Exists so
 * plain lib modules (e.g. lib/chatgpt.js) that aren't React components can build a
 * deterministic eventID without needing the useAuth() hook.
 */
export function getCachedUserId() {
  try {
    const raw = localStorage.getItem("feedify_user");
    return raw ? JSON.parse(raw)?.id || null : null;
  } catch {
    return null;
  }
}
