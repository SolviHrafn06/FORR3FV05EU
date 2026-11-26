// Hrein handarökfræði (engin three.js / DOM) svo hægt sé að prófa hana í node.
// Landmarks eru MediaPipe-punktar: { x, y, z } þar sem x,y eru 0..1 í myndinni.

export const UL = 0, THUMB_MCP = 2, THUMB_TIP = 4, INDEX_MCP = 5, INDEX_PIP = 6, INDEX_TIP = 8,
  MIDDLE_MCP = 9, MIDDLE_PIP = 10, MIDDLE_TIP = 12, RING_MCP = 13, RING_PIP = 14,
  RING_TIP = 16, PINKY_MCP = 17, PINKY_PIP = 18, PINKY_TIP = 20;

// [gómur, miðliður, hnúi] fyrir vísi-, mið-, baugfingur og litla fingur
const FINGUR = [[INDEX_TIP, INDEX_PIP, INDEX_MCP], [MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP],
  [RING_TIP, RING_PIP, RING_MCP], [PINKY_TIP, PINKY_PIP, PINKY_MCP]];

/** 2D fjarlægð í myndinni (x leiðrétt fyrir hlutfalli myndar). */
export function fjarlaegd(a, b, aspect = 1) {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}
/** 3D fjarlægð: breytist minna þegar höndin hallar að/frá myndavél. */
export function fjarlaegd3(a, b, aspect = 1) {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y, (a.z - b.z) * aspect);
}

/** Stærð handar. Stærra af lengd (úlnliður->miðhnúi) og breidd lófa, svo halli í aðra áttina minnki hana ekki. */
export function handStaerd(lm, aspect = 1) {
  return Math.max(fjarlaegd3(lm[UL], lm[MIDDLE_MCP], aspect), fjarlaegd3(lm[INDEX_MCP], lm[PINKY_MCP], aspect) * 1.3);
}

/** [vísi, mið, baug, litli]: fingur er krepptur ef gómurinn er nær úlnlið en miðliðurinn. */
export function krepptir(lm, aspect = 1) {
  return FINGUR.map(([tip, pip]) => fjarlaegd3(lm[tip], lm[UL], aspect) < fjarlaegd3(lm[pip], lm[UL], aspect));
}

/** Samfelld kreppa á fingur: (gómur->úlnliður)/(hnúi->úlnliður). Opinn fingur ~1.9, krepptur ~0.9. */
export function krull(lm, aspect = 1) {
  return FINGUR.map(([tip, , mcp]) => fjarlaegd3(lm[tip], lm[UL], aspect) / Math.max(fjarlaegd3(lm[mcp], lm[UL], aspect), 1e-6));
}

/**
 * Bending út frá 21 liðum (HandLandmarker), sömu nöfn og GestureRecognizer skilaði.
 * Fingur er beinn ef krull > 1.55, krepptur ef < 1.3; þar á milli er óvíst og skilar 'None'.
 * y vísar niður bæði í mynd- og heimshnitum MediaPipe.
 */
export function flokkaBendingu(lm, aspect = 1) {
  const k = krull(lm, aspect);
  const beinn = k.map((v) => v > 1.55), kreppt = k.map((v) => v < 1.3);
  const er = (...m) => m.every((s, i) => (s === 1 ? beinn[i] : kreppt[i]));
  const thumallUti = fjarlaegd3(lm[THUMB_TIP], lm[INDEX_MCP], aspect) / Math.max(handStaerd(lm, aspect), 1e-6) > 0.65;
  // lóðréttur hluti stefnu þumals / vísifingurs (-1 = beint upp)
  const upp = (tip, rot) => (lm[tip].y - lm[rot].y) / Math.max(fjarlaegd3(lm[tip], lm[rot], aspect), 1e-6);
  let nafn = 'None';
  if (er(0, 0, 0, 0)) nafn = !thumallUti ? 'Closed_Fist' : upp(THUMB_TIP, THUMB_MCP) < -0.6 ? 'Thumb_Up' : upp(THUMB_TIP, THUMB_MCP) > 0.6 ? 'Thumb_Down' : 'None';
  // ☝️ þarf þumal lagðan á miðfingur; laus þumall með sömu fingrum er zoom-staðan (HandStada), ekki bending
  else if (er(1, 0, 0, 0)) nafn = fjarlaegd3(lm[THUMB_TIP], lm[MIDDLE_PIP], aspect) / Math.max(handStaerd(lm, aspect), 1e-6) < 0.3
    && upp(INDEX_TIP, INDEX_MCP) < -0.5 ? 'Pointing_Up' : 'None';
  else if (er(1, 1, 0, 0)) nafn = 'Victory';
  else if (er(1, 0, 0, 1)) nafn = thumallUti ? 'ILoveYou' : 'None';
  else if (er(1, 1, 1, 1)) nafn = 'Open_Palm';
  return { categoryName: nafn, score: nafn === 'None' ? 0 : 1 };
}

/** Hnefi: vísifingur krepptur og a.m.k. 3 af 4 fingrum. */
export function erHnefi(lm, aspect = 1) {
  const k = krepptir(lm, aspect);
  return k[0] && k.filter(Boolean).length >= 3;
}

/** Klípustaða (eins og á síma): mið-, baugfingur og litli krepptir, vísifingur og þumall lausir. */
export function erZoomStada(lm, aspect = 1) {
  const [visi, mid, baug, litli] = krepptir(lm, aspect);
  return !visi && mid && baug && litli;
}

/** Klípuhlutfall: fjarlægð þumals og vísifingurs deilt með handarstærð (óháð fjarlægð frá myndavél). */
export function klipuHlutfall(lm, aspect = 1) {
  return fjarlaegd3(lm[THUMB_TIP], lm[INDEX_TIP], aspect) / Math.max(handStaerd(lm, aspect), 1e-6);
}

const GOMAR = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];
/** Útbreiðsla fingurgóma: meðalfjarlægð allra 5 góma frá miðju þeirra / handarstærð. Saman ~0.1, glenntir ~0.6. */
export function utbreidsla(lm, aspect = 1) {
  const m = midja(lm, GOMAR);
  return GOMAR.reduce((s, i) => s + fjarlaegd3(lm[i], m, aspect), 0) / GOMAR.length / Math.max(handStaerd(lm, aspect), 1e-6);
}

export function midja(lm, idx) {
  const p = { x: 0, y: 0, z: 0 };
  for (const i of idx) { p.x += lm[i].x; p.y += lm[i].y; p.z += lm[i].z; }
  p.x /= idx.length; p.y /= idx.length; p.z /= idx.length;
  return p;
}
export const lofaMidja = (lm) => midja(lm, [UL, INDEX_MCP, MIDDLE_MCP, RING_MCP, PINKY_MCP]);
export const klipuPunktur = (lm) => midja(lm, [THUMB_TIP, INDEX_TIP]);

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const norm = (a) => { const l = Math.hypot(a.x, a.y, a.z) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l }; };

/**
 * Hornréttur grunnur handar í "spegluðu" hnitakerfi senunnar (x hægri, y upp, z að áhorfanda).
 * Skilar [hlið, upp, normall] sem einingarvigrum; notað til að snúa hlut með úlnliðnum.
 */
export function handGrunnur(lm, aspect = 1) {
  const p = (i) => ({ x: (1 - lm[i].x) * aspect, y: 1 - lm[i].y, z: -lm[i].z * aspect });
  const upp = norm(sub(p(MIDDLE_MCP), p(UL)));
  const hlid0 = norm(sub(p(INDEX_MCP), p(PINKY_MCP)));
  const normall = norm(cross(hlid0, upp));
  const hlid = cross(upp, normall); // endur-hornrétta
  return [hlid, upp, normall];
}

const alfa = (cutoff, dt) => { const r = 2 * Math.PI * cutoff * dt; return r / (r + 1); };

/**
 * One Euro sía (Casiez o.fl. 2012) á alla punkta: kyrr hönd = mikil mýking (ekkert flökt),
 * hröð hreyfing = nánast engin töf. Staðallinn í handarakningu.
 */
export class Mykir {
  constructor(minCutoff = 3.5, beta = 20, dCutoff = 1) {
    Object.assign(this, { minCutoff, beta, dCutoff, x: null, dx: null, t: 0 });
  }
  update(lm, t) {
    const n = lm.flatMap((p) => [p.x, p.y, p.z]);
    if (!this.x) { this.x = n; this.dx = n.map(() => 0); this.t = t; }
    const dt = Math.max((t - this.t) / 1000, 1e-3);
    this.t = t;
    const ad = alfa(this.dCutoff, dt);
    for (let i = 0; i < n.length; i++) {
      this.dx[i] += ad * ((n[i] - this.x[i]) / dt - this.dx[i]);
      this.x[i] += alfa(this.minCutoff + this.beta * Math.abs(this.dx[i]), dt) * (n[i] - this.x[i]);
    }
    return lm.map((_, i) => ({ x: this.x[i * 3], y: this.x[i * 3 + 1], z: this.x[i * 3 + 2] }));
  }
}

/** One Euro sía á eina tölu (t.d. dýpt eða klípubil). */
export class Sia1D {
  constructor(minCutoff = 1, beta = 1, dCutoff = 1) { Object.assign(this, { minCutoff, beta, dCutoff, x: null, dx: 0, t: 0 }); }
  update(v, t) {
    if (this.x === null) { this.x = v; this.t = t; return v; }
    const dt = Math.max((t - this.t) / 1000, 1e-3);
    this.t = t;
    this.dx += alfa(this.dCutoff, dt) * ((v - this.x) / dt - this.dx);
    this.x += alfa(this.minCutoff + this.beta * Math.abs(this.dx), dt) * (v - this.x);
    return this.x;
  }
}

/**
 * Parar nýjar greiningar við fyrri hendur eftir staðsetningu lófa (besta heildarpörun).
 * MediaPipe merkir sömu höndina stundum "Left" og stundum "Right", svo merkið er ekki notað sem auðkenni.
 * Skilar fyrir hverja greiningu index fyrri handar, eða -1 ef þetta er ný hönd.
 */
export function paraSpor(fyrri, nyir, hamark = 0.35) {
  let best = nyir.map(() => -1), flest = -1, styst = Infinity;
  const por = nyir.map(() => -1), notud = new Set();
  // Líkaninu er takmarkað við tvær hendur; prófum bæði pör í stað gráðugrar pörunar sem tapar auðkenni.
  function profa(j, fjoldi, lengd) {
    if (j === nyir.length) {
      if (fjoldi > flest || (fjoldi === flest && lengd < styst)) { best = [...por]; flest = fjoldi; styst = lengd; }
      return;
    }
    for (let i = 0; i < fyrri.length; i++) {
      const d = Math.hypot(fyrri[i].x - nyir[j].x, fyrri[i].y - nyir[j].y);
      if (notud.has(i) || d >= hamark) continue;
      por[j] = i; notud.add(i); profa(j + 1, fjoldi + 1, lengd + d); notud.delete(i);
    }
    por[j] = -1; profa(j + 1, fjoldi, lengd);
  }
  profa(0, 0, 0);
  return best;
}

/**
 * Stöðuvél fyrir eina hönd. Grip notar samfellda kreppu með tveimur þröskuldum (hysteresis):
 * lokast undir 1.3, opnast yfir 1.55; hálfkreppt "kló" heldur núverandi stöðu svo gripið rofni ekki.
 */
export class HandStada {
  constructor() { this.hnefi = false; this.zoom = false; this.klipa = false; this.thensla = false; this.h = 0; this.z = 0; this.u = 0; this.t = 0; }
  update(lm, bending = null, vissa = 0, aspect = 1, t = this.t + 1000 / 30) {
    const dt = Math.min(100, Math.max(0, t - this.t));
    if (t - this.t > 250) this.h = this.z = this.u = 0;
    this.t = t;
    const k = krull(lm, aspect);
    const medal = (k[0] + k[1] + k[2] + k[3]) / 4;
    // 👍/👎 eru krepptar hendur með þumal út: þær eru skipanir, ekki grip
    const thumallUti = fjarlaegd3(lm[THUMB_TIP], lm[INDEX_MCP], aspect) / Math.max(handStaerd(lm, aspect), 1e-6) > 0.65;
    const thumalBending = (bending === 'Thumb_Up' || bending === 'Thumb_Down') && vissa >= 0.6;
    // í zoom-stöðu líkist þumall við vísifingur hnefa: þá þarf fulla kreppu til að grípa
    const lokud = thumallUti || thumalBending || this.thensla ? false : this.zoom
      ? medal < 1.15 && k[0] < 1.1
      // merki líkansins má hjálpa hálfkrepptri hönd, en aldrei yfirtrompa greinilega opna fingur
      : (medal < 1.3 && k[0] < 1.4) || (bending === 'Closed_Fist' && vissa >= 0.7 && medal < 1.45);
    // opnun ræðst eingöngu af fingrunum: rangt "Closed_Fist" frá líkaninu má ekki festa gripið
    const opin = medal > 1.55 || k[0] > 1.6;
    this.h = (this.hnefi ? opin : lokud) ? (this.h ? this.h + dt : 1000 / 30) : 0;
    // Tími í stað rammafjölda: hæg greining lengir ekki staðfestingu; einn rammi nægir aldrei.
    if (this.h >= (this.hnefi ? 100 : 2000 / 30) - 1e-6) { this.hnefi = !this.hnefi; this.h = 0; }

    // zoom: til að byrja þarf beinan vísifingur; eftir það má hann bogna (klípa) svo lengi sem hinir eru krepptir
    const kr = krepptir(lm, aspect);
    // ☝️ (Pointing_Up) hefur sömu fingur og zoom en þumalinn inni: það er leysirinn, ekki zoom
    const bendir = bending === 'Pointing_Up' && vissa >= 0.5;
    const zNu = !this.hnefi && kr[1] && kr[2] && kr[3] && (this.zoom || (!kr[0] && !bendir));
    this.z = zNu ? (this.z > 0 ? this.z + dt : 1000 / 30) : (this.z < 0 ? this.z - dt : -1000 / 30);
    if (!this.zoom && this.z >= 5000 / 30 - 1e-6) this.zoom = true;
    if (this.zoom && (this.z <= -4000 / 30 + 1e-6 || this.hnefi)) this.zoom = false;

    const kl = klipuHlutfall(lm, aspect);
    if (this.hnefi) this.klipa = false;
    else if (!this.klipa && kl < 0.33) this.klipa = true;
    else if (this.klipa && kl > 0.48) this.klipa = false;
    // útþensla: allir gómar saman (fingur beinir, ekki hnefi) í 3 ramma byrjar; lýkur við fulla opnun eða kreppu
    const ub = utbreidsla(lm, aspect);
    if (!this.thensla) {
      this.u = !this.hnefi && medal > 1.25 && ub < 0.2 ? (this.u ? this.u + dt : 1000 / 30) : 0;
      if (this.u >= 100 - 1e-6) { this.thensla = true; this.u = 0; }
    } else if (this.hnefi || this.zoom || medal < 1.15 || ub > 0.6) this.thensla = false;
    return { hnefi: this.hnefi, zoom: this.zoom, klipa: this.klipa, thensla: this.thensla, utbreidsla: ub, klipuHlutfall: kl, krull: medal };
  }
}
