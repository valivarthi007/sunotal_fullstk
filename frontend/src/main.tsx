import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import App from './App';
import './index.css';

// Wire the auth token so every API request includes the stored JWT
// Prefer admin session token when present (used by admin pages), fall back to regular user token
setAuthTokenGetter(() => localStorage.getItem('sunotal_admin_token') || localStorage.getItem('sunotal_token'));

createRoot(document.getElementById('root')!).render(<App />);
