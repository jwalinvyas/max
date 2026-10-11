/** Single, guarded service-worker registrar. Never registers in dev, iframes or Lovable preview. */
function refused() {
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (/(^|\.)lovableproject(-dev)?\.com$/.test(h)) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterApp() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js") || r.installing?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()),
  );
}

export async function setupPwa(onNeedRefresh: (update: () => void) => void) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (refused()) {
    await unregisterApp().catch(() => {});
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      onNeedRefresh(() => update(true));
    },
  });
}
