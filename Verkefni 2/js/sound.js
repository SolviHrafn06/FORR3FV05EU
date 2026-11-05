// =============================================================
//  sound.js – Einföld hljóð búin til með Web Audio API
//  (engar hljóðskrár þarf). Hljóð eru ekki skilyrði í verkefninu
//  en þau hjálpa litlum börnum að skilja hvað gerðist.
// =============================================================

let ctx = null;

/** Vafrar leyfa ekki hljóð fyrr en notandi hefur snert skjáinn. */
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

/** Spilar einn tón: tíðni (Hz), lengd (s), seinkun (s), bylgjuform */
function tone(freq, dur = 0.15, delay = 0, type = 'sine', vol = 0.18, slideTo = null) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export const sound = {
  lift: () => tone(520, 0.12, 0, 'sine', 0.12, 780),
  drop: () => tone(300, 0.1, 0, 'triangle', 0.12, 200),
  tap: () => tone(660, 0.08, 0, 'sine', 0.08),
  snap: () => { tone(660, 0.12); tone(990, 0.18, 0.08); },
  wrong: () => { tone(330, 0.14, 0, 'triangle', 0.14, 260); tone(260, 0.2, 0.14, 'triangle', 0.14, 220); },
  rotate: () => tone(880, 0.06, 0, 'square', 0.04),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.22, i * 0.12, 'triangle', 0.16)),
  whoosh: () => tone(200, 0.35, 0, 'sawtooth', 0.05, 900),
  unlock: () => { tone(440, 0.1); tone(660, 0.1, 0.1); tone(880, 0.2, 0.2); },
};
