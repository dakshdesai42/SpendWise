import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: Record<string, { postMessage: (payload: unknown) => void }>;
    };
  }
}

const TAB_PATHS = ['/dashboard', '/expenses', '/budgets', '/settings'] as const;

function normalizePath(pathname: string): string {
  for (const path of TAB_PATHS) {
    if (pathname === path || pathname.startsWith(`${path}/`)) return path;
  }
  return '/dashboard';
}

function resolveNativeRouteState(pathname: string): { path: string; visible: boolean } {
  for (const path of TAB_PATHS) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      return { path, visible: true };
    }
  }
  return { path: pathname || '/dashboard', visible: false };
}

export default function IOSNativeBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const isNativeIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  useEffect(() => {
    if (!isNativeIOS) return;
    const routeState = resolveNativeRouteState(location.pathname);
    const routeHandler = window.webkit?.messageHandlers?.spendwiseRoute;
    routeHandler?.postMessage(routeState);
  }, [isNativeIOS, location.pathname]);

  useEffect(() => {
    if (!isNativeIOS) return;

    const onNativeNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string }>).detail;
      const requestedPath = detail?.path;
      if (!requestedPath) return;
      const nextPath = normalizePath(requestedPath);
      if (location.pathname === nextPath) return;
      navigate(nextPath);
    };

    window.addEventListener('spendwise-native-navigate', onNativeNavigate as EventListener);
    return () => {
      window.removeEventListener('spendwise-native-navigate', onNativeNavigate as EventListener);
    };
  }, [isNativeIOS, navigate, location.pathname]);

  return null;
}
