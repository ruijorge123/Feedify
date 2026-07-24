// Web push via OneSignal — replaces the old raw VAPID/pywebpush flow.
// The SDK is loaded + initialized in public/index.html (window.OneSignalDeferred).

// Safe way to call OneSignal SDK methods from anywhere: queues the call if the SDK
// hasn't finished loading/initializing yet, runs immediately once it has.
function withOneSignal(callback) {
  return new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        resolve(await callback(OneSignal));
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Tags the current browser's push subscription with our own user id, so the backend
// can target notifications straight to this Feedify account via OneSignal's REST API.
// Called from AuthContext whenever the logged-in user changes — not tied to the
// subscribe button, so it's already set by the time the user opts in.
export function linkOneSignalUser(userId) {
  return withOneSignal((OneSignal) => OneSignal.login(String(userId))).catch(() => {});
}

export function unlinkOneSignalUser() {
  return withOneSignal((OneSignal) => OneSignal.logout()).catch(() => {});
}

export async function subscribeToPush() {
  // optIn() alone shows the native permission prompt (if not already granted) AND
  // subscribes in one step — calling requestPermission() first was a redundant extra
  // round-trip that just made this feel slow for no benefit.
  await withOneSignal((OneSignal) => OneSignal.User.PushSubscription.optIn());
  if (Notification.permission !== "granted") throw new Error("Izin notifikasi ditolak");
  return true;
}

export async function unsubscribeFromPush() {
  return withOneSignal((OneSignal) => OneSignal.User.PushSubscription.optOut());
}

export async function getPushStatus() {
  if (!("Notification" in window)) {
    return { supported: false, subscribed: false, permission: "default" };
  }
  // Notification.permission is a plain synchronous browser API — reading it directly
  // avoids waiting on the OneSignal SDK queue just for this part.
  const permission = Notification.permission;
  try {
    const subscribed = await withOneSignal((OneSignal) => !!OneSignal.User.PushSubscription.optedIn);
    return { supported: true, subscribed, permission };
  } catch {
    return { supported: true, subscribed: false, permission };
  }
}
