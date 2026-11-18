import * as THREE from 'three';

// Ganga, hlaup og kyrrstaða eru alvöru hreyfingar úr hreyfiföngun (mocap) sem voru fluttar yfir
// á Anakin og B1 með verkfaeri/flytja-hreyfingar.html og eru í hreyfingar/hreyfingar.json.
//
// Hér eru búnar til hreyfingarnar sem mocap-ið hefur ekki: hægri hönd Anakins sem heldur á
// sverðinu (vörn, högg, verja skot), fingur sem kreppast utan um skaftið og hendur B1 sem miða byssu.
//
// Hver hreyfing er listi af { bein, as, ... }:
//   bein   - nafnið á beininu, t.d. 'ValveBipedBip01_R_UpperArm_015'
//   as     - 'x', 'y' eða 'z': ásinn sem er snúið um, í hnitum módelsins í hvíldarstöðu (T-stelling)
//   midja, sveifla, fasi - hornið sveiflast eins og sínusbylgja (gráður):
//            horn = midja + sveifla * sin(2π * t / lengd + fasi)
//   lyklar - EÐA fylki af hornum sem dreifast jafnt yfir klippuna (fyrir hreyfingar sem gerast einu sinni)
//
// Ásar módelanna (bæði snúa í +x í hvíldarstöðu): x = fram, y = upp, z = til hægri.

const ASAR = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const SKREF = 16;   // hversu mörg keyframes eru í hverri klippu

function hornAtima(h, t, lengd) {
  if (h.lyklar) {
    // línuleg brúun á milli lyklanna
    const stada = (t / lengd) * (h.lyklar.length - 1);
    const i = Math.min(Math.floor(stada), h.lyklar.length - 2);
    return THREE.MathUtils.lerp(h.lyklar[i], h.lyklar[i + 1], stada - i);
  }
  const { midja = 0, sveifla = 0, fasi = 0 } = h;
  return midja + sveifla * Math.sin((2 * Math.PI * t) / lengd + fasi);
}

// Verður að kalla á þetta á meðan módelið er í hvíldarstöðu og áður en því er snúið eða það skalað.
export function buaTilKlippu(model, nafn, lengd, hreyfingar) {
  model.updateMatrixWorld(true);
  const timar = [];
  for (let i = 0; i <= SKREF; i++) timar.push((i / SKREF) * lengd);

  // safna saman öllum snúningum hvers beins
  const eftirBeinum = new Map();
  for (const h of hreyfingar) {
    if (!eftirBeinum.has(h.bein)) eftirBeinum.set(h.bein, []);
    eftirBeinum.get(h.bein).push(h);
  }

  const spor = [];
  for (const [beinNafn, listi] of eftirBeinum) {
    const bein = model.getObjectByName(beinNafn);
    if (!bein) {
      console.warn('Fann ekki beinið', beinNafn);
      continue;
    }
    // P = hvernig foreldri beinsins snýr í hnitum módelsins
    const P = bein.parent.getWorldQuaternion(new THREE.Quaternion());
    const Pinv = P.clone().invert();

    const gildi = [];
    for (const t of timar) {
      // R = allir snúningar beinsins lagðir saman (sá fyrsti í listanum fyrst)
      const R = new THREE.Quaternion();
      for (const h of listi) {
        const snuningur = new THREE.Quaternion().setFromAxisAngle(ASAR[h.as], THREE.MathUtils.degToRad(hornAtima(h, t, lengd)));
        R.premultiply(snuningur);
      }
      // snúningur í hnitum módelsins → í hnitum beinsins:  nýtt = P⁻¹ · R · P · hvíldarstaða
      const q = Pinv.clone().multiply(R).multiply(P).multiply(bein.quaternion);
      gildi.push(q.x, q.y, q.z, q.w);
    }
    spor.push(new THREE.QuaternionKeyframeTrack(bein.name + '.quaternion', timar, gildi));
  }
  return new THREE.AnimationClip(nafn, lengd, spor);
}


// ==================== ANAKIN: HÆGRI HÖND OG FINGUR ====================

const A = 'ValveBipedBip01_';

// Fingurnir vísa út eftir handleggnum (+z hægra megin, -z vinstra megin) og lófinn snýr niður,
// svo snúningur um x kreppir þá. Hægri höndin kreppist fast utan um skaftið, sú vinstri slakar.
function fingur(hlid, krepping) {
  const formerki = hlid === 'R' ? 1 : -1;
  const listi = [];
  const nofn = hlid === 'R'
    ? [['018', '019', '020'], ['021', '022', '023'], ['024', '025', '026'], ['027', '028', '029']]
    : [['037', '038', '039'], ['040', '041', '042'], ['043', '044', '045'], ['046', '047', '048']];
  nofn.forEach((liðir, f) => {
    const fingurNr = 4 - f;   // Finger4 (litli) … Finger1 (vísifingur)
    liðir.forEach((nr, lidur) => {
      const nafn = `${A}${hlid}_Finger${fingurNr}${lidur === 0 ? '' : lidur}_${nr}`;
      listi.push({ bein: nafn, as: 'x', midja: formerki * krepping });
    });
  });
  // þumallinn
  const thumall = hlid === 'R' ? ['030', '031', '032'] : ['049', '050', '051'];
  thumall.forEach((nr, lidur) => {
    listi.push({ bein: `${A}${hlid}_Finger0${lidur === 0 ? '' : lidur}_${nr}`, as: 'x', midja: formerki * krepping * 0.5 });
  });
  return listi;
}

const FINGUR = [...fingur('R', 65), ...fingur('L', 20)];

// varnarstaða: höndin fyrir framan beltið, sverðið upp á ská
const VORN = [
  { bein: A + 'R_UpperArm_015', as: 'x', midja: 82 },   // hönd niður með síðunni
  { bein: A + 'R_UpperArm_015', as: 'z', midja: 20 },   // og aðeins fram
  { bein: A + 'R_Forearm_016', as: 'y', midja: 65 },    // olnbogi beygður
  ...FINGUR,
];

export function anakinKlippur(model) {
  return {
    vorn: buaTilKlippu(model, 'Guard', 1, VORN),
    // lyfta sverðinu yfir öxlina, höggva niður á ská og aftur í vörn
    hogg: buaTilKlippu(model, 'Swing', 0.5, [
      { bein: A + 'R_UpperArm_015', as: 'x', lyklar: [82, 15, 60, 82] },
      { bein: A + 'R_UpperArm_015', as: 'z', lyklar: [20, 100, 55, 20] },
      { bein: A + 'R_Forearm_016', as: 'y', lyklar: [65, 110, 10, 65] },
      ...FINGUR,
    ]),
    // snögg hreyfing þegar skot er slegið til baka: sverðinu sveiflað út og aftur
    verja: buaTilKlippu(model, 'Parry', 0.3, [
      { bein: A + 'R_UpperArm_015', as: 'x', lyklar: [82, 55, 82] },
      { bein: A + 'R_UpperArm_015', as: 'z', lyklar: [20, 55, 20] },
      { bein: A + 'R_Forearm_016', as: 'y', lyklar: [65, 30, 65] },
      ...FINGUR,
    ]),
  };
}


// ==================== B1 BATTLE DROID: HENDUR SEM MIÐA ====================

export const B1_HAEGRI_HOND = 'Bone028_019';

// báðar hendur fram eins og droidinn haldi á byssu, með smá titringi
export function droidKlippur(model) {
  return {
    mida: buaTilKlippu(model, 'Aim', 2, [
      { bein: 'Bone026_017', as: 'z', midja: 70, sveifla: 2 },   // hægri öxl
      { bein: 'Bone012_09', as: 'z', midja: 60 },                // vinstri öxl
      { bein: 'Bone012_09', as: 'x', midja: 20 },
      { bein: 'Bone027_018', as: 'z', midja: 15 },               // hægri olnbogi
      { bein: 'Bone013_010', as: 'z', midja: 35 },               // vinstri olnbogi
    ]),
  };
}
