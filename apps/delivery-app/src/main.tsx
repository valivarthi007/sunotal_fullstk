import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { setAuthTokenGetter as setLocalAuthTokenGetter } from '@/lib/api-client';
import App from './App';
import './index.css';

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
