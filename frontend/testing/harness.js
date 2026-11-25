/**
 * REBUNAR — developer-only UI test harness.
 * Enabled only on Vite's development server with ?rebunarTest=1.
 * Never records form values, passwords, cookies, or request bodies.
 */
export function installTestHarness() {
  if (!import.meta.env.DEV) return null;
  if (new URLSearchParams(window.location.search).get('rebunarTest') !== '1') return null;
  if (window.__REBUNAR_TEST__) return window.__REBUNAR_TEST__;

  const events = [];
  let statusNode = null;
  const record = (type, details = {}) => {
    events.push({ type, at: new Date().toISOString(), ...details });
    if (events.length > 250) events.shift();
    renderStatus();
  };

  const getSnapshot = () => {
    const outlet = document.querySelector('#screen-outlet');
    const heading = outlet?.querySelector('h1, h2')?.textContent?.trim() || '';
    const controls = [...(outlet || document).querySelectorAll('button, a, [role="button"]')]
      .filter(element => !element.disabled && element.getAttribute('aria-hidden') !== 'true')
      .map(element => ({
        tag: element.tagName.toLowerCase(),
        label: (element.getAttribute('aria-label') || element.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 90),
        route: element.dataset.route || null,
        disabled: Boolean(element.disabled)
      }));
    return {
      route: window.location.hash.replace(/^#\\/?/, '') || null,
      heading,
      controls,
      errors: events.filter(item => ['error', 'unhandled_rejection', 'http_error', 'network_error'].includes(item.type)),
      events: [...events]
    };
  };

  function renderStatus() {
    if (!statusNode || !statusNode.isConnected) return;
    const errors = events.filter(item => ['error', 'unhandled_rejection', 'http_error', 'network_error'].includes(item.type)).length;
    statusNode.textContent = `REBUNAR TEST · ${events.length} событий · ${errors} ошибок`;
    statusNode.dataset.hasErrors = errors ? 'true' : 'false';
  }

  window.addEventListener('error', event => {
    record('error', { message: String(event.message || 'JavaScript error').slice(0, 240) });
  });
  window.addEventListener('unhandledrejection', event => {
    record('unhandled_rejection', {
      message: String(event.reason?.message || event.reason || 'Unhandled promise rejection').slice(0, 240)
    });
  });
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('button, a, [role="button"]') : null;
    if (!target) return;
    record('click', {
      label: (target.getAttribute('aria-label') || target.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 90),
      route: target.dataset.route || null
    });
  }, true);
  window.addEventListener('rebunar:route-change', event => {
    record('route', { path: event.detail?.path || null });
  });

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const requestUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    let path = requestUrl;
    try { path = new URL(requestUrl, window.location.href).pathname; } catch {}
    try {
      const response = await originalFetch(...args);
      if (path.startsWith('/api/') && !response.ok) record('http_error', { path, status: response.status });
      return response;
    } catch (error) {
      if (path.startsWith('/api/')) record('network_error', { path, message: String(error?.message || 'Network error').slice(0, 160) });
      throw error;
    }
  };

  statusNode = document.createElement('div');
  statusNode.id = 'rebunar-test-status';
  statusNode.setAttribute('role', 'status');
  statusNode.setAttribute('aria-live', 'polite');
  statusNode.style.cssText = [
    'position:fixed', 'right:10px', 'bottom:10px', 'z-index:2147483000',
    'max-width:calc(100vw - 20px)', 'padding:8px 11px',
    'border:1px solid rgba(93,220,150,.45)', 'border-radius:10px',
    'background:rgba(5,22,14,.94)', 'color:#caffdc',
    'font:600 11px/1.3 system-ui,sans-serif', 'pointer-events:none',
    'box-shadow:0 4px 18px rgba(0,0,0,.3)'
  ].join(';');
  document.body.appendChild(statusNode);

  const api = {
    enabled: true,
    snapshot: getSnapshot,
    clear() { events.length = 0; renderStatus(); },
    report() { return JSON.stringify(getSnapshot(), null, 2); }
  };
  Object.defineProperty(window, '__REBUNAR_TEST__', {
    configurable: false, enumerable: false, writable: false, value: api
  });
  record('harness_ready', { mode: 'development' });
  return api;
}
