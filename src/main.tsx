import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { initializeIOSNativeChrome } from './native/iosSetup';
import App from './App';
import './styles/app.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

void initializeIOSNativeChrome();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CurrencyProvider>
            <App />
            <Toaster
              position="top-center"
              containerStyle={{
                top: 'calc(env(safe-area-inset-top) + 10px)',
              }}
              toastOptions={{
                style: {
                  background: '#1C1C1E',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  fontSize: '14px',
                },
                success: {
                  iconTheme: {
                    primary: '#32D74B',
                    secondary: '#1C1C1E',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#FF453A',
                    secondary: '#1C1C1E',
                  },
                },
              }}
            />
          </CurrencyProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);
