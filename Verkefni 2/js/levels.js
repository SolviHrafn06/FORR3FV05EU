// =============================================================
//  levels.js – Form púslbitanna og borðin (levels)
// -------------------------------------------------------------
//  Hver púslbiti er skilgreindur í sínu eigin hnitakerfi þar sem
//  (0,0) er miðja bitans og bitinn er u.þ.b. 140 x 140 einingar.
//
//  - silhouette: útlínan (eitt <path> "d"). Hún er notuð bæði fyrir
//    bitann sjálfan og fyrir mótið (gatið) á borðinu.
//    Útlínan getur verið samsett úr mörgum undirferlum (subpaths)
//    sem skarast. Þar sem allir undirferlar snúa réttsælis og
//    fill-rule er "nonzero" verður fyllingin sameining (union) þeirra.
//  - details: skraut sem er teiknað ofan á bitann (augu, nef o.s.frv.)
//  - startRot: hve mikið bitinn er snúinn í byrjun (barnið þarf þá
//    að snúa honum með tveimur fingrum).
//  - symmetry: snúningssamhverfa. 360 = bara ein rétt staða,
//    90 = ferningur passar í hvaða 90° stöðu sem er, 0 = hvaða staða sem er.
// =============================================================

// ---------- Hjálparföll sem búa til undirferla (allir réttsælis) ----------

/** Hringur með miðju (cx,cy) og radíus r */
const circle = (cx, cy, r) =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 1 ${2 * r} 0 a${r} ${r} 0 1 1 ${-2 * r} 0 Z`;

/** Sporbaugur (ellipse) */
const ellipse = (cx, cy, rx, ry) =>
  `M${cx - rx} ${cy} a${rx} ${ry} 0 1 1 ${2 * rx} 0 a${rx} ${ry} 0 1 1 ${-2 * rx} 0 Z`;

/** Rúnnaður ferhyrningur */
const roundRect = (x, y, w, h, r) =>
  `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} ` +
  `V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} ` +
  `A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;

/** Marghyrningur – snýr punktunum við ef þeir eru rangsælis */
const poly = (pts) => {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
  }
  const p = area < 0 ? [...pts].reverse() : pts;
  return 'M' + p.map(([x, y]) => `${x} ${y}`).join(' L') + ' Z';
};

/** Marghyrningur með rúnnuðum hornum (notað fyrir þríhyrning, hús, stjörnu) */
const roundedPoly = (pts, r) => {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
  }
  const p = area < 0 ? [...pts].reverse() : pts;
  const n = p.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const prev = p[(i - 1 + n) % n], cur = p[i], next = p[(i + 1) % n];
    const v1 = [prev[0] - cur[0], prev[1] - cur[1]];
    const v2 = [next[0] - cur[0], next[1] - cur[1]];
    const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
    const rr = Math.min(r, l1 / 2.2, l2 / 2.2);
    const a = [cur[0] + (v1[0] / l1) * rr, cur[1] + (v1[1] / l1) * rr];
    const b = [cur[0] + (v2[0] / l2) * rr, cur[1] + (v2[1] / l2) * rr];
    d += (i === 0 ? 'M' : 'L') + `${a[0].toFixed(1)} ${a[1].toFixed(1)} `;
    d += `Q${cur[0]} ${cur[1]} ${b[0].toFixed(1)} ${b[1].toFixed(1)} `;
  }
  return d + 'Z';
};

/** Punktar fyrir stjörnu með n örmum */
const starPoints = (n, rOut, rIn, cy = 0) => {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    pts.push([+(Math.cos(a) * r).toFixed(1), +(Math.sin(a) * r + cy).toFixed(1)]);
  }
  return pts;
};

// Litir í anda gamalla viðarleikfanga
const COL = {
  red: '#e63946', blue: '#3a86ff', yellow: '#ffbe0b', green: '#43aa8b',
  pink: '#ff70a6', orange: '#fb8500', purple: '#8e5bd8', white: '#fbf6ec',
  dark: '#3b2f2f', eyeWhite: '#ffffff',
};

/** Augu sem mörg dýranna nota */
const eye = (x, y, r = 7) => [
  { d: circle(x, y, r), fill: COL.eyeWhite },
  { d: circle(x + r * 0.25, y + r * 0.1, r * 0.55), fill: COL.dark },
  { d: circle(x + r * 0.45, y - r * 0.25, r * 0.2), fill: COL.eyeWhite },
];

/** Bros-andlit sem formin fá (lítil smáatriði gera þau vinalegri) */
const face = (y = 0, s = 1) => [
  ...eye(-18 * s, y - 8 * s, 6 * s),
  ...eye(18 * s, y - 8 * s, 6 * s),
  { d: `M${-14 * s} ${y + 10 * s} Q0 ${y + 24 * s} ${14 * s} ${y + 10 * s}`, stroke: COL.dark, width: 5 * s },
];

// ---------- Púslbitarnir ----------

export const PIECES = {
  // ---- Borð 1: einföld form ----
  circle: {
    color: COL.red,
    silhouette: circle(0, 0, 64),
    details: face(0),
    startRot: 0, symmetry: 0,
  },
  square: {
    color: COL.blue,
    silhouette: roundRect(-58, -58, 116, 116, 14),
    details: face(0),
    startRot: 0, symmetry: 90,
  },
  triangle: {
    color: COL.yellow,
    silhouette: roundedPoly([[0, -66], [70, 58], [-70, 58]], 14),
    details: face(18, 0.85),
    startRot: 0, symmetry: 360,
  },

  // ---- Borð 2: form sem þarf stundum að snúa ----
  star: {
    color: COL.green,
    silhouette: roundedPoly(starPoints(5, 72, 32, 6), 7),
    details: face(8, 0.8),
    startRot: 0, symmetry: 72,
  },
  heart: {
    color: COL.pink,
    silhouette:
      'M0 62 C-22 46 -70 16 -70 -18 C-70 -46 -46 -62 -24 -60 C-12 -59 -4 -51 0 -42 ' +
      'C4 -51 12 -59 24 -60 C46 -62 70 -46 70 -18 C70 16 22 46 0 62 Z',
    details: face(-4, 0.85),
    startRot: 180, symmetry: 360,
  },
  house: {
    color: COL.purple,
    silhouette: roundedPoly([[0, -68], [66, -8], [66, 62], [-66, 62], [-66, -8]], 10),
    details: [
      { d: roundRect(-14, 18, 28, 44, 6), fill: COL.yellow },
      { d: roundRect(-46, 0, 24, 22, 4), fill: '#bde0fe' },
      { d: roundRect(22, 0, 24, 22, 4), fill: '#bde0fe' },
      { d: circle(6, 42, 3), fill: COL.dark },
    ],
    startRot: 90, symmetry: 360,
  },

  // ---- Borð 3: dýr ----
  fish: {
    color: COL.orange,
    silhouette: ellipse(10, 0, 56, 40) + ' ' + poly([[-30, 0], [-74, 40], [-62, 0], [-74, -40]]),
    details: [
      { d: 'M-4 -38 Q10 -60 30 -38 Z', fill: '#ffb703' },
      { d: 'M-14 -30 Q-24 0 -14 30', stroke: '#ffb703', width: 6 },
      { d: 'M2 -34 Q-8 0 2 34', stroke: '#ffb703', width: 6 },
      ...eye(38, -10, 9),
      { d: 'M56 10 Q50 16 44 12', stroke: COL.dark, width: 4 },
    ],
    startRot: 90, symmetry: 360,
  },
  duck: {
    color: COL.yellow,
    silhouette: [
      ellipse(-6, 22, 58, 34),
      circle(26, -28, 26),
      ellipse(58, -22, 20, 9),
      poly([[-48, 4], [-74, -16], [-58, 30]]),
    ].join(' '),
    details: [
      { d: ellipse(58, -22, 20, 9), fill: COL.orange },
      { d: 'M40 -22 L76 -22', stroke: '#c85d00', width: 2.5 },
      { d: 'M-34 14 Q-6 -2 22 18 Q-4 42 -34 14 Z', fill: '#f4a300' },
      ...eye(30, -36, 7),
    ],
    startRot: 0, symmetry: 360,
  },
  pig: {
    color: COL.pink,
    silhouette: [
      ellipse(-10, 12, 54, 36),
      circle(36, -8, 30),
      poly([[18, -30], [22, -56], [40, -36]]),
      poly([[40, -38], [58, -54], [60, -26]]),
      roundRect(-48, 30, 18, 28, 7),
      roundRect(10, 30, 18, 28, 7),
    ].join(' '),
    details: [
      { d: ellipse(60, 0, 13, 11), fill: '#ff4f8b' },
      { d: circle(56, -1, 2.8), fill: COL.dark },
      { d: circle(64, -1, 2.8), fill: COL.dark },
      ...eye(36, -18, 6),
      { d: 'M-64 6 q-14 -6 -8 -16 q8 -4 6 8', stroke: '#ff4f8b', width: 4 },
    ],
    startRot: 0, symmetry: 360,
  },
  sheep: {
    color: COL.white,
    silhouette: [
      circle(-34, 4, 24), circle(-8, -14, 28), circle(22, -6, 26),
      circle(-14, 20, 28), circle(16, 18, 26), circle(-44, 24, 18),
      ellipse(50, -10, 20, 26),
      roundRect(-34, 34, 14, 30, 6),
      roundRect(8, 34, 14, 30, 6),
    ].join(' '),
    details: [
      { d: ellipse(50, -10, 20, 26), fill: COL.dark },
      { d: roundRect(-34, 40, 14, 24, 6), fill: COL.dark },
      { d: roundRect(8, 40, 14, 24, 6), fill: COL.dark },
      { d: ellipse(34, -22, 10, 6), fill: COL.dark },
      ...eye(56, -16, 6),
    ],
    startRot: 180, symmetry: 360,
  },
};

/** Borðin í röð. Eftir síðasta borð byrjar leikurinn aftur á fyrsta. */
export const LEVELS = [
  { pieces: ['circle', 'square', 'triangle'], board: '#c98b4f' },
  { pieces: ['star', 'heart', 'house'], board: '#b97a45' },
  { pieces: ['fish', 'duck', 'pig', 'sheep'], board: '#d29a5c' },
];

export { circle, ellipse, roundRect, poly, roundedPoly, starPoints };
