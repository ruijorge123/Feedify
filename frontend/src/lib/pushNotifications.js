import api from "./api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch (e) {
    console.warn("SW registration failed:", e);
    return null;
  }
}

export async function subscribeToPush() {
  if (!("PushManager" in window)) throw new Error("Push not supported");

  const reg = await registerServiceWorker();
  if (!reg) throw new Error("Service worker tidak tersedia");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Izin notifikasi ditolak");

  const { data } = await api.get("/push/vapid-public-key");
  const applicationServerKey = urlBase64ToUint8Array(data.public_key);

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  await api.post("/push/subscribe", { subscription: subscription.toJSON() });
  return subscription;
}

export async function unsubscribeFromPush() {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) await sub.unsubscribe();
  await api.delete("/push/unsubscribe");
}

export async function getPushStatus() {
  if (!("PushManager" in window) || !("serviceWorker" in navigator)) {
    return { supported: false, subscribed: false, permission: "default" };
  }
  const permission = Notification.permission;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return {
    supported: true,
    subscribed: !!sub,
    permission,
  };
}
