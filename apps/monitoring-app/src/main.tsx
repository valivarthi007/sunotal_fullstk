// Intercept global fetch so any relative /api/ call is sent directly to API Gateway from browser
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && (input.startsWith('/api/') || input.startsWith('/api'))) {
      input = `https://api.automateuniverse.space${input.startsWith('/') ? '' : '/'}${input}`;
    } else if (input instanceof Request && (input.url.startsWith('/api/') || input.url.startsWith('/api'))) {
      input = new Request(`https://api.automateuniverse.space${input.url}`, input);
    }
    return originalFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
