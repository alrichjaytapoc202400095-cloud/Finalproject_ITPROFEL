import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { NetworkStatusProvider } from './context/NetworkStatusContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import './styles.css';

// PWA service worker: precaches the app shell and applies runtime caching for
// catalog GETs and product images (configured in vite.config.js).
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('spc:offline-ready'));
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <NetworkStatusProvider>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </NetworkStatusProvider>
    </BrowserRouter>
  </React.StrictMode>
);
