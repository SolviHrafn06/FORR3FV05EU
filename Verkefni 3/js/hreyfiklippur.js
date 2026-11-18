import * as THREE from 'three';

// Anakin og B1 droidinn eru með beinagrind (skeleton) en engar tilbúnar hreyfingar.
// Hér eru hreyfiklippur (AnimationClip) búnar til í kóða með því að snúa beinunum.
//
// Hver hreyfing er listi af { bein, as, ... }:
//   bein   - nafnið á beininu, t.d. 'ValveBipedBip01_R_Thigh_052'
//   as     - 'x', 'y' eða 'z': ásinn sem er snúið um, í hnitum módelsins í hvíldarstöðu
//   midja, sveifla, fasi - hornið sveiflast eins og sínusbylgja (gráður):
//            horn = midja + sveifla * sin(2π * t / lengd + fasi)
//   lyklar - EÐA fylki af hornum sem dreifast jafnt yfir klippuna (fyrir högg sem gerast einu sinni)
//
// Ásar módelanna (bæði snúa í +x í hvíldarstöðu): x = fram, y = upp, z = til hægri.
// Fótur sem vísar niður fer FRAM við jákvæðan snúning um z.

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


// ==================== ANAKIN ====================

const A = 'ValveBipedBip01_';
const H = Math.PI;   // hálfur hringur: fótur sem er í fasa H hreyfist á móti hinum

// hægri höndin heldur á sverðinu í varnarstöðu (vorn) eða heggur (hogg). Hinar hreyfingarnar snerta hana ekki,
// svo hægt er að ganga og höggva á sama tíma.
const VORN = [
  { bein: A + 'R_UpperArm_015', as: 'x', midja: 82 },   // hönd niður með síðunni
  { bein: A + 'R_UpperArm_015', as: 'z', midja: 20 },   // og aðeins fram
  { bein: A + 'R_Forearm_016', as: 'y', midja: 65 },    // olnbogi beygður svo höndin er fyrir framan beltið
];

function vinstriHondNidur(sveifla, fasi) {
  return [
    { bein: A + 'L_UpperArm_034', as: 'x', midja: -72 },
    { bein: A + 'L_UpperArm_034', as: 'z', midja: 0, sveifla, fasi },
    { bein: A + 'L_Forearm_035', as: 'y', midja: -15 },
  ];
}

function faetur(laeri, hne) {
  return [
    { bein: A + 'R_Thigh_052', as: 'z', sveifla: laeri },
    { bein: A + 'L_Thigh_055', as: 'z', sveifla: laeri, fasi: H },
    // hnéð beygist bara aftur, mest þegar fóturinn er á leið fram
    { bein: A + 'R_Calf_053', as: 'z', midja: -hne, sveifla: -hne, fasi: H / 2 },
    { bein: A + 'L_Calf_056', as: 'z', midja: -hne, sveifla: -hne, fasi: H / 2 + H },
  ];
}

export function anakinKlippur(model) {
  return {
    kyrr: buaTilKlippu(model, 'Idle', 3, [
      ...vinstriHondNidur(0, 0),
      { bein: A + 'Spine2_04', as: 'z', sveifla: 1.5 },   // andar rólega
      { bein: A + 'Head1_07', as: 'y', sveifla: 4 },      // lítur aðeins í kringum sig
    ]),
    ganga: buaTilKlippu(model, 'Walk', 1.1, [
      ...faetur(24, 18),
      ...vinstriHondNidur(-18, 0),
      { bein: A + 'Spine2_04', as: 'y', sveifla: 4 },
    ]),
    hlaupa: buaTilKlippu(model, 'Run', 0.62, [
      ...faetur(36, 30),
      ...vinstriHondNidur(-35, 0),
      { bein: A + 'L_Forearm_035', as: 'y', midja: -50 },
      { bein: A + 'Spine1_03', as: 'z', midja: -10 },      // hallar sér fram
      { bein: A + 'Spine2_04', as: 'y', sveifla: 7 },
    ]),
    vorn: buaTilKlippu(model, 'Guard', 1, VORN),
    // lyfta sverðinu yfir öxlina, höggva niður á ská og aftur í vörn
    hogg: buaTilKlippu(model, 'Swing', 0.5, [
      { bein: A + 'R_UpperArm_015', as: 'x', lyklar: [82, 15, 60, 82] },
      { bein: A + 'R_UpperArm_015', as: 'z', lyklar: [20, 100, 55, 20] },
      { bein: A + 'R_Forearm_016', as: 'y', lyklar: [65, 110, 10, 65] },
      { bein: A + 'Spine2_04', as: 'y', lyklar: [0, 25, -30, 0] },
    ]),
  };
}


// ==================== B1 BATTLE DROID ====================

const VINSTRI_LAERI = 'Bone002_024';
const HAEGRI_LAERI = 'Bone022_027';
const VINSTRA_HNE = 'Bone003_025';
const HAEGRA_HNE = 'Bone023_028';
const VINSTRI_OXL = 'Bone012_09';
const HAEGRI_OXL = 'Bone026_017';
const VINSTRI_OLNBOGI = 'Bone013_010';
const HAEGRI_OLNBOGI = 'Bone027_018';

// báðar hendur fram eins og droidinn haldi á byssu
const MIDA = [
  { bein: HAEGRI_OXL, as: 'z', midja: 70 },
  { bein: VINSTRI_OXL, as: 'z', midja: 60 },
  { bein: VINSTRI_OXL, as: 'x', midja: 20 },
  { bein: HAEGRI_OLNBOGI, as: 'z', midja: 15 },
  { bein: VINSTRI_OLNBOGI, as: 'z', midja: 35 },
];

export function droidKlippur(model) {
  return {
    ganga: buaTilKlippu(model, 'March', 0.9, [
      ...MIDA,
      { bein: HAEGRI_LAERI, as: 'z', sveifla: 22 },
      { bein: VINSTRI_LAERI, as: 'z', sveifla: 22, fasi: H },
      { bein: HAEGRA_HNE, as: 'z', midja: -15, sveifla: -15, fasi: H / 2 },
      { bein: VINSTRA_HNE, as: 'z', midja: -15, sveifla: -15, fasi: H / 2 + H },
    ]),
    mida: buaTilKlippu(model, 'Aim', 2, [
      ...MIDA,
      { bein: HAEGRI_OXL, as: 'y', sveifla: 3 },   // smá titringur
    ]),
  };
}
