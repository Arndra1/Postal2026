// Bell chime synthesized with the Web Audio API — no audio file to host or load.
//
// Browsers keep an AudioContext suspended until the visitor has interacted with
// the page, so playBellChime() resolves to true only when the chime actually
// started. Callers use that to defer the sound to the first interaction.

let audioContext = null;

// Without a prior user gesture, resume() stays pending indefinitely rather than
// rejecting — so it is raced against this timeout instead of being awaited.
const RESUME_TIMEOUT_MS = 400;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) {
    try {
      audioContext = new Ctx();
    } catch (_e) {
      return null;
    }
  }
  return audioContext;
}

// Inharmonic partials of a struck bell: [frequency ratio, level, decay seconds]
const PARTIALS = [
  [0.56, 0.30, 3.4],
  [0.92, 0.44, 2.8],
  [1.19, 0.32, 2.3],
  [1.71, 0.18, 1.5],
  [2.00, 0.24, 1.3],
  [2.74, 0.12, 0.9],
  [3.76, 0.07, 0.6],
];

const FUNDAMENTAL_HZ = 660;

function strike(audio) {
  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.value = 0.32;
  master.connect(audio.destination);

  for (const [ratio, level, decay] of PARTIALS) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = FUNDAMENTAL_HZ * ratio;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + decay + 0.05);
  }
}

export async function playBellChime() {
  const audio = getAudioContext();
  if (!audio) return false;

  if (audio.state === "suspended") {
    await Promise.race([
      audio.resume().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, RESUME_TIMEOUT_MS)),
    ]);
  }

  if (audio.state !== "running") return false;
  strike(audio);
  return true;
}