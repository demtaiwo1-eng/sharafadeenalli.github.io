self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = String(data.title || "New public update").slice(0,80);
  const options = {
    body: String(data.body || "New public-source information is available.").slice(0,180),
    icon: "./favicon.ico",
    badge: "./favicon.ico",
    data: { url: data.url || "./" },
    tag: "sarafadeen-public-update",
    renotify: true
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "./", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type:"window", includeUncontrolled:true }).then(list => {
    for (const client of list) if (client.url.startsWith(self.location.origin) && "focus" in client) { client.navigate(target); return client.focus(); }
    return clients.openWindow(target);
  }));
});
