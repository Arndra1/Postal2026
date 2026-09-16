import React, { useEffect, useRef, useState } from "react";
import { Loader2, ChevronDown } from "lucide-react";

const THRESHOLD = 70;
const MAX_PULL = 90;

// Selectors for overlays that own their own touch gestures; PTR ignores
// touches that start inside them so bottom sheets / dialogs scroll cleanly.
const OVERLAY_SELECTOR =
  '[data-slot="drawer-content"], [role="dialog"], [data-radix-popper-content-wrapper"], [data-slot="sheet-content"]';

/**
 * Pull-to-refresh wrapper for touch devices. Listens on the document so it
 * works with the window-scrolling content area. Calls `onRefresh` (async)
 * when the user pulls past the threshold while at scroll top.
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [supported, setSupported] = useState(false);

  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const startY = useRef(null);
  const eligible = useRef(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });
  useEffect(() => {
    setSupported(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    if (!supported) return;

    const onStart = (e) => {
      // Skip when the wrapper is hidden (keep-alive inactive tab) so only the
      // visible tab's pull-to-refresh can fire.
      if (!wrapperRef.current || wrapperRef.current.offsetParent === null) {
        startY.current = null;
        eligible.current = false;
        return;
      }
      if (e.target?.closest?.(OVERLAY_SELECTOR)) {
        startY.current = null;
        eligible.current = false;
        return;
      }
      if (window.scrollY > 0) {
        startY.current = null;
        eligible.current = false;
        return;
      }
      startY.current = e.touches[0].clientY;
      eligible.current = true;
    };

    const onMove = (e) => {
      if (!eligible.current || startY.current == null || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        if (pullRef.current !== 0) {
          pullRef.current = 0;
          setPullDistance(0);
        }
        return;
      }
      if (window.scrollY <= 0) {
        e.preventDefault();
        const next = Math.min(dy * 0.4, MAX_PULL);
        pullRef.current = next;
        setPullDistance(next);
      } else {
        eligible.current = false;
        if (pullRef.current) {
          pullRef.current = 0;
          setPullDistance(0);
        }
      }
    };

    const onEnd = async () => {
      const reached = pullRef.current >= THRESHOLD;
      if (reached && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullDistance(THRESHOLD);
        try {
          await onRefreshRef.current?.();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          pullRef.current = 0;
          setPullDistance(0);
        }
      } else {
        pullRef.current = 0;
        setPullDistance(0);
      }
      startY.current = null;
      eligible.current = false;
    };

    const onCancel = () => {
      pullRef.current = 0;
      setPullDistance(0);
      startY.current = null;
      eligible.current = false;
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
  }, [supported]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div ref={wrapperRef} className="relative">
      {supported && (pullDistance > 0 || refreshing) && (
        <div
          className="absolute left-1/2 top-0 z-30 flex items-center justify-center pointer-events-none"
          style={{ transform: `translate(-50%, ${pullDistance}px)`, height: 32 }}
        >
          {refreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <ChevronDown
              className="w-5 h-5 text-muted-foreground transition-transform duration-150"
              style={{ transform: `rotate(${progress >= 1 ? 180 : 0}deg)` }}
            />
          )}
        </div>
      )}
      {children}
    </div>
  );
}