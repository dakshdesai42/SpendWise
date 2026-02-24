import { useCallback, useRef, useState } from 'react';

interface UseLongPressOptions {
    onLongPress: () => void;
    onClick?: () => void;
    ms?: number;
}

export function useLongPress({ onLongPress, onClick, ms = 400 }: UseLongPressOptions) {
    const [longPressTriggered, setLongPressTriggered] = useState(false);
    const timerRef = useRef<number | null>(null);

    const start = useCallback(() => {
        setLongPressTriggered(false);
        timerRef.current = window.setTimeout(() => {
            onLongPress();
            setLongPressTriggered(true);
        }, ms);
    }, [onLongPress, ms]);

    const clear = useCallback(
        (_e?: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
            if (timerRef.current) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            if (shouldTriggerClick && !longPressTriggered && onClick) {
                onClick();
            }
            setLongPressTriggered(false);
        },
        [longPressTriggered, onClick]
    );

    return {
        onTouchStart: start,
        onTouchEnd: (e: React.TouchEvent) => clear(e),
        onTouchMove: (e: React.TouchEvent) => clear(e, false),
        onMouseDown: start,
        onMouseUp: (e: React.MouseEvent) => clear(e),
        onMouseLeave: (e: React.MouseEvent) => clear(e, false)
    };
}
