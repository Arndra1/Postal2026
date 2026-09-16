import { useEffect, useRef, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

// Primary bottom-tab routes whose page state should be preserved (kept
// mounted) when the user switches between them.
const TAB_PATHS = [
  "/dashboard",
  "/discover",
  "/find-leads-unified",
  "/pipeline",
  "/account",
];

const isTabPath = (p) => TAB_PATHS.includes(p);

/**
 * Keep-alive outlet for tab routes: each visited tab's rendered tree is
 * cached and kept mounted (hidden) so switching back preserves scroll/state.
 * Non-tab routes render directly with a subtle slide transition.
 */
export default function KeepAliveOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const cacheRef = useRef(new Map());
  const [, force] = useState(0);

  useEffect(() => {
    if (isTabPath(location.pathname)) {
      cacheRef.current.set(location.pathname, outlet);
      force((n) => n + 1);
    }
  }, [location.pathname, outlet]);

  if (!isTabPath(location.pathname)) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {outlet}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <>
      {TAB_PATHS.map((p) => {
        const el = cacheRef.current.get(p);
        if (!el) return null;
        const active = p === location.pathname;
        return (
          <div key={p} aria-hidden={!active} style={{ display: active ? "block" : "none" }}>
            {el}
          </div>
        );
      })}
    </>
  );
}