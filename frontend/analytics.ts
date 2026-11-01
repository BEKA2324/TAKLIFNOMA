// Anonymous browser identifier is stored by the server as an HttpOnly cookie.
const session = Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) =>
  n.toString(16).padStart(2, '0'),
).join('');
let ready = false;
async function track(action: 'view' | 'heartbeat' | 'leave') {
  try {
    const result = await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session, action }),
      keepalive: true,
    });
    if (result.ok) {
      const state = (await result.json()) as { registered: boolean };
      ready = state.registered;
      if (!ready && action === 'heartbeat') void track('view');
    }
  } catch {
    /* Statistics never interrupt invitation creation. */
  }
}
void track('view');
setInterval(() => {
  if (!document.hidden) void track(ready ? 'heartbeat' : 'view');
}, 25000);
window.addEventListener('pageshow', () => {
  if (ready) void track('heartbeat');
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void track(ready ? 'heartbeat' : 'view');
  else if (ready) void track('leave');
});
window.addEventListener('pagehide', () => {
  if (ready) navigator.sendBeacon('/api/analytics', JSON.stringify({ session, action: 'leave' }));
});
