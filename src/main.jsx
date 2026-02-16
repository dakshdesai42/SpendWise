import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import App from './App';
import './styles/app.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CurrencyProvider>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#1a1a3e',
                color: '#f1f5f9',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#1a1a3e',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#1a1a3e',
                },
              },
            }}
          />
        </CurrencyProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
