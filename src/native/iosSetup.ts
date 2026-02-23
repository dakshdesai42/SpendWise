import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';

export async function initializeIOSNativeChrome(): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return;

  document.documentElement.classList.add('ios-native');

  await Promise.allSettled([
    StatusBar.setOverlaysWebView({ overlay: true }),
    StatusBar.setStyle({ style: Style.Light }),
    Keyboard.setResizeMode({ mode: KeyboardResize.Body }),
  ]);
}
