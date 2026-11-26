// Skipanir með MediaPipe-bendingum: halda bendingu í smá stund til að staðfesta (eins og að halda inni takka).
// Hreint JS (ekkert DOM / three.js) svo hægt sé að prófa í node.

export const SKIPANIR = {
  Victory: 'xray',          // ✌️ röntgen
  Thumb_Up: 'nyr',          // 👍 nýr hlutur
  Thumb_Down: 'eyda',       // 👎 eyða hlut
  ILoveYou: 'nullstilla',   // 🤟 endurstilla allt
};
export const HALDTIMI = 700; // ms
const BROTTFALL = 150;       // ms: eins ramma brottfall líkansins núllstillir ekki framvinduna

export class BendingaHald {
  constructor(haldtimi = HALDTIMI, lagmark = 0.65) {
    Object.assign(this, { haldtimi, lagmark, nafn: null, t0: 0, sidast: -1e9, laest: false });
  }

  /** Skilar { nafn, framvinda 0..1, skipun } þar sem skipun kemur einu sinni þegar haldið er nógu lengi. */
  update(nafn, vissa, t) {
    const raun = vissa >= this.lagmark && nafn in SKIPANIR ? nafn : null;
    let n = raun;
    if (!raun && this.nafn && t - this.sidast < BROTTFALL) n = this.nafn;
    if (raun) this.sidast = t;
    if (n !== this.nafn) { this.nafn = n; this.t0 = t; this.laest = false; }
    if (!n) return { nafn: null, framvinda: 0, skipun: null };
    const framvinda = Math.min(1, (t - this.t0) / this.haldtimi);
    // læst eftir að skipun fer af stað: þarf að sleppa bendingunni áður en hún virkar aftur
    if (framvinda >= 1 && !this.laest) { this.laest = true; return { nafn: n, framvinda: 1, skipun: SKIPANIR[n] }; }
    return { nafn: n, framvinda: this.laest ? 1 : framvinda, skipun: null };
  }
}
