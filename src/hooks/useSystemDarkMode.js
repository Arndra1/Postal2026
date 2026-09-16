import { useEffect } from "react";

/**
 * Syncs the `dark` class on <html> with the iOS/system color-scheme preference.
 * Call once near the root of the app.
 */
export function useSystemDarkMode() {
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.classList.toggle("dark", mql.matches);
    };
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);
}