import { createContext, useContext, useEffect, useRef } from "react";

// Supplied by KeepAliveOutlet. `true` means this page is the visible tab.
// Defaults to `true` so pages rendered outside the keep-alive outlet behave
// normally.
export const TabActiveContext = createContext(true);

/**
 * Runs `onActivate` whenever a keep-alive tab becomes the visible one again.
 *
 * Tab routes stay mounted while hidden so scroll position survives, which also
 * means their mount effect never runs a second time. Without this, a page like
 * the dashboard keeps showing the data it loaded the first time it was opened.
 */
export default function useTabActive(onActivate) {
  const active = useContext(TabActiveContext);
  const callbackRef = useRef(onActivate);

  useEffect(() => {
    callbackRef.current = onActivate;
  });

  const wasActive = useRef(active);

  useEffect(() => {
    if (active && !wasActive.current) callbackRef.current?.();
    wasActive.current = active;
  }, [active]);
}