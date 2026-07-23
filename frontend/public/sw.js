self.addEventListener("push", (event) => {
  let data = { title: "Feedify", body: "Ada pengingat baru!" };
  try { data = event.data.json(); } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title || "Feedify", {
      body: data.body || "",
      icon: data.icon || "/logo192.png",
      badge: data.badge || "/logo192.png",
      vibrate: [200, 100, 200],
      tag: "feedify-reminder",
      renotify: true,
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});
