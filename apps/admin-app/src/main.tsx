import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { setAuthTokenGetter as setLocalAuthTokenGetter } from '@/lib/api-client';
import App from './App';
import './index.css';

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

// Purge legacy test mock orders from localStorage
try {
  const stored = localStorage.getItem('sunotal_user_orders');
  if (stored) {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter(
        (item: any) =>
          item.id !== 'ORD-2026-7425' &&
          item.id !== 'ORD-2026-2298' &&
          item.orderNumber !== 'ORD-2026-7425' &&
          item.orderNumber !== 'ORD-2026-2298'
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem('sunotal_user_orders', JSON.stringify(cleaned));
      }
    }
  }
} catch (e) {}

const tokenGetter = () => {
  const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  return isAdminPath
    ? localStorage.getItem('sunotal_admin_token')
    : localStorage.getItem('sunotal_token');
};

// Wire the auth token so every API request includes the stored JWT.
// Restrict admin token only to paths starting with /admin to prevent session cross-leak.
setAuthTokenGetter(tokenGetter);
setLocalAuthTokenGetter(tokenGetter);

createRoot(document.getElementById('root')!).render(<App />);
