import { useState, useEffect } from "react";

declare var navigator: Navigator & { standalone?: boolean };

export enum BreakPoint {
    ExtraSmall = 'xs',
    Small = 'sm',
    Medium = 'md',
    Large = 'lg',
    ExtraLarge = 'xl',
    ExtraExtraLarge = '2xl'
}

// tailwind breakpoints
export const twbp: { [key in BreakPoint]: number } = {
    'xs': 0,
    'sm': 640,
    'md': 768,
    'lg': 1024,
    'xl': 1280,
    '2xl': 1536,
};

function isStandalone() {
    return (window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && !!navigator.standalone));
}

export function useWindowSize() {
    const [windowSize, setWindowSize] = useState<{ width: number, height: number, bp: BreakPoint, standalone: boolean }>({ width: undefined!, height: undefined!, bp: undefined!, standalone: true });

    useEffect(() => {

        const handleResize = () => {
            let width = window.innerWidth;
            let height = window.innerHeight;
            let bp: BreakPoint;

            if (width >= twbp.xs && width < twbp.sm) {
                bp = BreakPoint.ExtraSmall;
            } else if (width >= twbp.sm && width < twbp.md) {
                bp = BreakPoint.Small;
            } else if (width >= twbp.md && width < twbp.lg) {
                bp = BreakPoint.Medium;
            } else if (width >= twbp.lg && width < twbp.xl) {
                bp = BreakPoint.Large;
            } else if (width >= twbp.xl && width < twbp['2xl']) {
                bp = BreakPoint.ExtraLarge;
            } else {
                bp = BreakPoint.ExtraExtraLarge;
            }

            setWindowSize({ width, height, bp, standalone: isStandalone() });
        }

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return windowSize;
}