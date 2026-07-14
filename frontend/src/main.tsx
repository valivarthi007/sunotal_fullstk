import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import App from './App';
import './index.css';

// Wire the auth token so every API request includes the stored JWT
setAuthTokenGetter(() => localStorage.getItem('sunotal_token'));

createRoot(document.getElementById('root')!).render(<App />);
