export const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  });
};

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
};

export const showAppNotification = async ({ title, body, tag }) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  if (registration?.showNotification) {
    registration.showNotification(title, {
      body,
      tag,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg"
    });
    return;
  }

  new Notification(title, {
    body,
    tag,
    icon: "/icons/icon.svg"
  });
};
