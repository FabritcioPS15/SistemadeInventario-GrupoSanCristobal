import { useState, useEffect, useRef } from 'react';

export function useHeaderVisible(isPinned: boolean = false) {
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);
    const scrollThreshold = 10; // Pixels to scroll before hiding/showing

    useEffect(() => {
        if (isPinned) {
            setIsVisible(true);
            return;
        }

        const handleScroll = (e: any) => {
            // If we are listening on document with capture: true, the target is the scrolling element
            const target = e.target === document ? (document.scrollingElement || document.documentElement) : e.target;
            if (!(target instanceof HTMLElement || target instanceof Document)) return;

            const currentScrollY = target instanceof Document
                ? (window.scrollY || document.documentElement.scrollTop)
                : (target as HTMLElement).scrollTop;

            // If we're at the very top, always show
            if (currentScrollY <= 0) {
                setIsVisible(true);
                lastScrollY.current = 0;
                return;
            }

            // Check if we've scrolled enough to trigger a change
            const scrollDiff = Math.abs(currentScrollY - lastScrollY.current);
            if (scrollDiff < scrollThreshold) return;

            if (currentScrollY > lastScrollY.current) {
                // Scrolling down
                setIsVisible(false);
            } else {
                // Scrolling up
                setIsVisible(true);
            }

            lastScrollY.current = currentScrollY;
        };

        document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
        return () => document.removeEventListener('scroll', handleScroll, { capture: true });
    }, [isPinned]);

    return isVisible;
}
