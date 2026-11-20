self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const date = event.notification.data?.date || "";
  const target = new URL("/#/planner/" + date, self.location.origin).href;
  event.waitUntil(
    (async () => {
      for (const tab of await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      })) {
        if (new URL(tab.url).origin === self.location.origin) {
          await tab.navigate(target);
          return tab.focus();
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
