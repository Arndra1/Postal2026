import { useEffect, useState } from "react";
import { playBellChime } from "@/lib/bellSound";

// Rings the brand bell once per browser session — used on the landing page only.
//
// The swing always runs on load. The chime plays on load when the browser allows
// it; when the browser blocks audio until the visitor interacts, the chime is
// deferred to that first interaction, played once, then dropped for good.
const SESSION_KEY = "ringbellz:bell-rung";
const SWING_MS = 1700;
const INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart", "wheel", "scroll"];

export default function useBellRing() {
  const [ringing, setRinging] = useState(false);

  useEffect(() => {
    let alreadyRung = false;
    try {
      alreadyRung = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (_e) {
      alreadyRung = false;
    }
    if (alreadyRung) return;

    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch (_e) {
      /* storage unavailable — ring anyway */
    }

    setRinging(true);
    const settle = setTimeout(() => setRinging(false), SWING_MS);

    let cancelled = false;
    let sounded = false;
    let attempting = false;
    let detach = () => {};

    playBellChime().then((played) => {
      if (played || cancelled) return;

      // Sound was blocked before any gesture. Listen for the first interaction
      // and try again — listeners stay attached until a chime actually plays,
      // so a gesture the browser does not count (e.g. a scroll) isn't wasted.
      const onInteraction = () => {
        if (sounded || attempting) return;
        attempting = true;
        playBellChime().then((ok) => {
          attempting = false;
          if (!ok) return;
          sounded = true;
          detach();
        });
      };

      detach = () =>
        INTERACTION_EVENTS.forEach((e) => window.removeEventListener(e, onInteraction));
      INTERACTION_EVENTS.forEach((e) =>
        window.addEventListener(e, onInteraction, { passive: true })
      );
    });

    return () => {
      cancelled = true;
      clearTimeout(settle);
      detach();
    };
  }, []);

  return ringing;
}