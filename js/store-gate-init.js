// B-P Atlas v1.2 · © SCOUT SYSTEM
// Run synchronously after the upstream gate; keep script-src 'self' intact.
if (typeof initStoreGate === 'function') {
  const requestedLang = new URLSearchParams(location.search).get('lang') || navigator.language || 'zh';
  const lang = /^zh(?:[-_]|$)/i.test(requestedLang.trim()) ? 'zh' : 'en';
  const decision = initStoreGate({
    appKey: 'bp',
    mode: 'entry-gate',
    portalIds: ['appstore'],
    silentPortalIds: ['library'],
    allowStandalone: true,
    autoRedirectSeconds: 0,
    lang
  });
  if (!decision.allowed) {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant-HK' : 'en';
    document.documentElement.dataset.lang = lang;
  }
}
