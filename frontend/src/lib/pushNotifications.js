// Web push via Webpushr — replaces the OneSignal integration (see public/index.html for the
// SDK snippet + public/webpushr-sw.js for the service worker). Unlike OneSignal, Webpushr shows
// its own permission prompt automatically once the snippet loads — there is no documented
// programmatic subscribe/unsubscribe/status API to drive a custom toggle button, so this module
// only tags whichever subscriber ends up opted-in with the logged-in Feedify user's id (via
// Webpushr's custom-attribute mechanism), so the backend can target them by that attribute.

const WEBPUSHR_ATTRIBUTE_KEY = "feedify_user_id";

function callWebpushr(...args) {
  try {
    window.webpushr = window.webpushr || function () {
      (window.webpushr.q = window.webpushr.q || []).push(arguments);
    };
    window.webpushr(...args);
  } catch {
    // Snippet not loaded (blocked, offline, etc.) — safe to ignore, matches prior OneSignal
    // behavior of failing silently rather than surfacing an error to the user.
  }
}

export function linkWebpushrUser(userId) {
  callWebpushr("attributes", { [WEBPUSHR_ATTRIBUTE_KEY]: String(userId) });
}

export function unlinkWebpushrUser() {
  callWebpushr("attributes", { [WEBPUSHR_ATTRIBUTE_KEY]: "" });
}
