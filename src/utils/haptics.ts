import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();

/** Light tap — category chip select, toggle, tab switch */
export function hapticLight(): void {
    if (!isNative) return;
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });
}

/** Medium tap — button press, form submit */
export function hapticMedium(): void {
    if (!isNative) return;
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => { });
}

/** Heavy tap — destructive actions (delete) */
export function hapticHeavy(): void {
    if (!isNative) return;
    Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => { });
}

/** Success — expense added, budget saved */
export function hapticSuccess(): void {
    if (!isNative) return;
    Haptics.notification({ type: NotificationType.Success }).catch(() => { });
}

/** Warning — budget exceeded, validation error */
export function hapticWarning(): void {
    if (!isNative) return;
    Haptics.notification({ type: NotificationType.Warning }).catch(() => { });
}

/** Error — failed action */
export function hapticError(): void {
    if (!isNative) return;
    Haptics.notification({ type: NotificationType.Error }).catch(() => { });
}

/** Selection tick — scrolling through options */
export function hapticSelection(): void {
    if (!isNative) return;
    Haptics.selectionStart().catch(() => { });
    Haptics.selectionChanged().catch(() => { });
    Haptics.selectionEnd().catch(() => { });
}
