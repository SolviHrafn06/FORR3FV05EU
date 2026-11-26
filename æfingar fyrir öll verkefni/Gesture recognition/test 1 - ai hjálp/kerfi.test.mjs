// Keyrt með: node kerfi.test.mjs
import assert from 'node:assert/strict';
import { BendingaHald, SKIPANIR } from './bendingar.js';
import { aresktur } from './edlisfraedi.js';

// --- bendingar: halda til að staðfesta, einu sinni, þolir eins ramma brottfall ---
{
  const b = new BendingaHald(700);
  assert.equal(b.update('Victory', 0.9, 0).skipun, null);
  assert.equal(b.update('Victory', 0.9, 350).framvinda, 0.5);
  assert.equal(b.update('None', 0.9, 400).nafn, 'Victory', 'eins ramma brottfall heldur bendingunni');
  assert.equal(b.update('Victory', 0.9, 700).skipun, 'xray');
  assert.equal(b.update('Victory', 0.9, 1500).skipun, null, 'kviknar bara einu sinni');
  b.update('None', 0, 1700); b.update('None', 0, 1900);
  b.update('Victory', 0.9, 2000);
  assert.equal(b.update('Victory', 0.9, 2700).skipun, 'xray', 'virkar aftur eftir að bendingu er sleppt');
}
{
  const b = new BendingaHald(700);
  b.update('Thumb_Up', 0.9, 0);
  b.update('Thumb_Down', 0.9, 400);              // skipt um bendingu = byrja upp á nýtt
  assert.equal(b.update('Thumb_Down', 0.9, 900).skipun, null);
  assert.equal(b.update('Thumb_Down', 0.9, 1100).skipun, 'eyda');
  assert.equal(new BendingaHald().update('Victory', 0.3, 0).nafn, null, 'óviss bending er hunsuð');
  assert.equal(new BendingaHald().update('Pointing_Up', 0.99, 0).nafn, null, 'Pointing_Up er leysir, ekki haldskipun');
  assert.equal(new BendingaHald().update('constructor', 0.99, 0).nafn, null, 'aðeins eigin bendingar í skipanalistanum eru gildar');
  assert.deepEqual(Object.values(SKIPANIR).sort(), ['eyda', 'nullstilla', 'nyr', 'xray']);
}

// --- árekstrar ---
const v3 = (x, y = 0, z = 0) => ({ x, y, z });
{
  // jafn massi, beint á, fullt endurkast: skipta um hraða
  const a = { p: v3(0), v: v3(1), r: 0.5 }, b = { p: v3(0.9), v: v3(-1), r: 0.5 };
  assert.equal(aresktur(a, b, 1), true);
  assert.ok(Math.abs(a.v.x + 1) < 1e-9 && Math.abs(b.v.x - 1) < 1e-9);
  assert.ok(b.p.x - a.p.x >= 1 - 1e-9, 'ýtt í sundur');
}
{
  // haldinn hlutur (kyrr) hreyfist ekki en ýtir hinum
  const a = { p: v3(0), v: v3(2), r: 0.5, kyrr: true }, b = { p: v3(0.8), v: v3(0), r: 0.5 };
  aresktur(a, b, 0.6);
  assert.equal(a.p.x, 0);
  assert.ok(b.p.x >= 1 - 1e-9 && b.v.x > 2, 'ýtt og hraðað');
}
{
  const a = { p: v3(0), v: v3(0), r: 0.5 }, b = { p: v3(2), v: v3(0), r: 0.5 };
  assert.equal(aresktur(a, b), false, 'snertast ekki');
  const c = { p: v3(0), v: v3(-1), r: 0.5 }, d = { p: v3(0.9), v: v3(1), r: 0.5 };
  aresktur(c, d);
  assert.equal(c.v.x, -1, 'eru að fjarlægjast: hraði óbreyttur');
}

console.log('bendingar.js + edlisfraedi.js: öll próf stóðust');
