import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { initializeIOSNativeChrome } from './native/iosSetup';
import DynamicToaster from './components/ui/DynamicToaster';
import AppErrorBoundary from './components/ui/AppErrorBoundary';
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

// Safety timeout: force-hide splash if auth hangs beyond 3 seconds
if (Capacitor.isNativePlatform()) {
  setTimeout(() => {
    SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
  }, 3000);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CurrencyProvider>
            <AppErrorBoundary>
              <App />
              <DynamicToaster />
            </AppErrorBoundary>
          </CurrencyProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);
