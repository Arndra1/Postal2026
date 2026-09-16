import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

// Binds a detail-modal open state to a URL query param (?leadId=ID) so the iOS
// back / swipe-back gesture closes the modal without leaving the page.
//
// open(id)  -> pushes a new history entry with the param set
// close()   -> replaces the current entry with the param removed, so back does
//              not re-open the modal
export function useUrlDetailParam(paramName) {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get(paramName) || "";

  const open = useCallback(
    (newId) => {
      const next = new URLSearchParams(searchParams);
      next.set(paramName, newId);
      setSearchParams(next, { replace: false });
    },
    [paramName, searchParams, setSearchParams]
  );

  const close = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(paramName);
    setSearchParams(next, { replace: true });
  }, [paramName, searchParams, setSearchParams]);

  return { id, open, close };
}