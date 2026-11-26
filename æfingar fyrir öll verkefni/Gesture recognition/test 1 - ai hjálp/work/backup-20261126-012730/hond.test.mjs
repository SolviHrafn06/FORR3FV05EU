// Keyrt með: node hond.test.mjs
import assert from 'node:assert/strict';
import { erHnefi, erZoomStada, klipuHlutfall, utbreidsla, HandStada, handGrunnur, Mykir, Sia1D, paraSpor } from './hond.js';

// gervihönd: úlnliður neðst, fingur upp. kreppt = gómur dreginn niður að hnúa.
function hond({ kreppt = [false, false, false, false], thumb = { x: 0.36, y: 0.58 } } = {}) {
  const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  lm[0] = { x: 0.5, y: 0.85, z: 0 };
  lm[4] = { ...thumb, z: 0 };
  [[5, 0.44], [9, 0.48], [13, 0.52], [17, 0.56]].forEach(([mcp, x], i) => {
    lm[mcp] = { x, y: 0.6, z: 0 };
    lm[mcp + 1] = { x, y: 0.5, z: 0 };                       // PIP
    lm[mcp + 3] = { x, y: kreppt[i] ? 0.64 : 0.4, z: 0 };    // TIP
  });
  return lm;
}

const opin = hond();
const hnefi = hond({ kreppt: [true, true, true, true], thumb: { x: 0.45, y: 0.62 } });
const zoomVitt = hond({ kreppt: [false, true, true, true] });
const zoomLokad = hond({ kreppt: [false, true, true, true], thumb: { x: 0.44, y: 0.41 } });

assert.equal(erHnefi(opin), false);
assert.equal(erHnefi(hnefi), true);
assert.equal(erHnefi(zoomVitt), false, 'zoom-staða má ekki teljast hnefi');
assert.equal(erZoomStada(zoomVitt), true);
assert.equal(erZoomStada(opin), false);
assert.ok(klipuHlutfall(zoomLokad) < klipuHlutfall(zoomVitt));

// tregða: einn rammi af hnefa grípur ekki, tveir gera það; sleppir eftir 3 opna
const s = new HandStada();
assert.equal(s.update(hnefi).hnefi, false);
assert.equal(s.update(hnefi).hnefi, true);
assert.equal(s.update(opin).hnefi, true);
assert.equal(s.update(opin).hnefi, true);
assert.equal(s.update(opin).hnefi, false);

// rangt "Closed_Fist" frá líkaninu má ekki festa gripið
const s5 = new HandStada(); s5.update(hnefi); s5.update(hnefi);
for (let i = 0; i < 3; i++) s5.update(opin, 'Closed_Fist', 0.9);
assert.equal(s5.hnefi, false);
for (let i = 0; i < 5; i++) s5.update(opin, 'Closed_Fist', 0.9);
assert.equal(s5.hnefi, false, 'rangt merki á opna hönd má ekki grípa aftur');

// klípa lokuð í zoom-stöðu (vísifingur boginn) heldur zoom og grípur EKKI
const klipaLokud = hond({ kreppt: [false, true, true, true], thumb: { x: 0.44, y: 0.55 } }).map((p, i) => i === 8 ? { ...p, y: 0.55 } : p);
const s6 = new HandStada();
for (let i = 0; i < 5; i++) s6.update(zoomVitt);
for (let i = 0; i < 6; i++) s6.update(klipaLokud);
assert.equal(s6.zoom, true, 'zoom á að haldast meðan klipið er');
assert.equal(s6.hnefi, false, 'klípa má ekki teljast grip');

// hálfkreppt kló (á milli þröskulda) heldur gripi
const klo = hond({ kreppt: [true, true, true, true] }).map((p, i) => [8, 12, 16, 20].includes(i) ? { ...p, y: 0.5 } : p);
const s4 = new HandStada(); s4.update(hnefi); s4.update(hnefi);
for (let i = 0; i < 5; i++) s4.update(klo);
assert.equal(s4.hnefi, true, 'kló á ekki að sleppa');

// zoom kviknar ekki á stuttri millistöðu á leið í hnefa
const s2 = new HandStada();
for (let i = 0; i < 3; i++) s2.update(zoomVitt);
assert.equal(s2.zoom, false);
s2.update(hnefi); s2.update(hnefi);
assert.equal(s2.zoom, false);
const s3 = new HandStada();
for (let i = 0; i < 5; i++) s3.update(zoomVitt);
assert.equal(s3.zoom, true);

// grunnur er hornréttur og einingarlengd
const [a, b, c] = handGrunnur(opin);
const dot = (u, v) => u.x * v.x + u.y * v.y + u.z * v.z;
for (const v of [a, b, c]) assert.ok(Math.abs(dot(v, v) - 1) < 1e-9);
assert.ok(Math.abs(dot(a, b)) < 1e-9 && Math.abs(dot(b, c)) < 1e-9);
assert.ok(b.y > 0.99, 'upp-vigur á að vísa upp');

// One Euro: flökt dempast, hröð hreyfing nær markinu fljótt
const f = new Mykir();
let ut;
for (let i = 0; i < 60; i++) ut = f.update(opin.map((p) => ({ ...p, x: p.x + (i % 2 ? 0.005 : -0.005) })), i * 33);
assert.ok(Math.abs(ut[0].x - 0.5) < 0.002, 'flökt á að dempast');
for (let i = 60; i < 66; i++) ut = f.update(opin.map((p) => ({ ...p, x: p.x + 0.2 })), i * 33);
assert.ok(Math.abs(ut[0].x - 0.7) < 0.02, 'hröð hreyfing á að ná markinu innan 200 ms');

// 👍 (krepptir fingur, þumall upp) grípur ekki, hvorki eftir fingrum né merki líkansins
const thumall = hond({ kreppt: [true, true, true, true], thumb: { x: 0.40, y: 0.35 } });
const s7 = new HandStada();
for (let i = 0; i < 4; i++) s7.update(thumall);
assert.equal(s7.hnefi, false, 'þumall upp er ekki grip');
const s8 = new HandStada();
for (let i = 0; i < 4; i++) s8.update(hnefi, 'Thumb_Down', 0.9);
assert.equal(s8.hnefi, false, 'Thumb_Down merki hindrar grip');

// ☝️ benda kveikir ekki á zoom
const s9 = new HandStada();
for (let i = 0; i < 6; i++) s9.update(zoomVitt, 'Pointing_Up', 0.9);
assert.equal(s9.zoom, false, 'Pointing_Up er leysir, ekki zoom');

// útþensla: allir gómar saman -> byrjar eftir 3 ramma, grípur ekki; glennt út -> lýkur; hnefi byrjar hana ekki
const saman = hond();
[4, 8, 12, 16, 20].forEach((i, k) => { saman[i] = { x: 0.49 + k * 0.005, y: 0.38, z: 0 }; });
const glennt = hond({ thumb: { x: 0.2, y: 0.55 } });
[8, 12, 16, 20].forEach((i, k) => { glennt[i] = { x: 0.3 + k * 0.13, y: 0.36, z: 0 }; });
assert.ok(utbreidsla(saman) < 0.2 && utbreidsla(glennt) > 0.6, 'útbreiðsla: saman lítil, glennt mikil');
const s10 = new HandStada();
s10.update(saman); s10.update(saman);
assert.equal(s10.thensla, false, '2 rammar duga ekki');
s10.update(saman);
assert.equal(s10.thensla, true, 'gómar saman = útþensla');
assert.equal(s10.hnefi, false, 'gómar saman er ekki grip');
s10.update(glennt);
assert.equal(s10.thensla, false, 'full opnun lýkur útþenslu');
const s11 = new HandStada();
for (let i = 0; i < 5; i++) s11.update(hnefi);
assert.equal(s11.thensla, false, 'hnefi er ekki útþensla');

// Sia1D: dempar flökt
const sd = new Sia1D(0.8, 1.5);
let sv;
for (let i = 0; i < 60; i++) sv = sd.update(1 + (i % 2 ? 0.05 : -0.05), i * 33);
assert.ok(Math.abs(sv - 1) < 0.02);

// paraSpor: hendur halda auðkenni eftir staðsetningu, jafnvel ef þær víxlast í röð greininga
assert.deepEqual(paraSpor([{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }], [{ x: 0.78, y: 0.5 }, { x: 0.22, y: 0.52 }]), [1, 0]);
assert.deepEqual(paraSpor([{ x: 0.2, y: 0.5 }], [{ x: 0.9, y: 0.1 }]), [-1], 'of langt = ný hönd');
assert.deepEqual(paraSpor([], [{ x: 0.5, y: 0.5 }]), [-1]);

console.log('hond.js: öll próf stóðust');
