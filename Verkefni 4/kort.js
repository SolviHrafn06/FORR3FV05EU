// Eitt atriði fyrir hvert spil. Röðin hér = röð markanna (targets) í targets.mind.
//   nafn:   nafnið sem birtist yfir Pokémoninum
//   mynd:   flöt, skorin mynd af spilinu (skönnun eða ljósmynd beint ofan frá)
//   likan:  .glb líkan. Ef það vantar birtist einföld staðgengilsvera í litnum `litur`
//   hp:     líf í upphafi
//   skali:  stækkun líkansins (1 = um 0,75 spilabreiddir á hæð)
//   litur:  litur staðgengilsverunnar
//   klippur (valfrjálst): nöfn hreyfiklippa í .glb skránni. Ef sleppt er leitað
//           að klippum sem innihalda idle / attack / hit / faint í nafninu.
//   leikmadur: true á spilinu sem þú stýrir með höndunum. Hin spilin eru
//           andstæðingar sem tölvan stýrir.
export const KORT = [
  {
    nafn: 'Pokémon 1',
    leikmadur: true,
    mynd: 'kort/kort1.jpg',
    likan: 'likon/pokemon1.glb',
    hp: 100,
    skali: 1,
    litur: 0xffcb05,
    // klippur: { idle: 'Idle', attack: 'Attack', hit: 'Hit', faint: 'Faint' },
  },
  {
    nafn: 'Pokémon 2',
    mynd: 'kort/kort2.jpg',
    likan: 'likon/pokemon2.glb',
    hp: 100,
    skali: 1,
    litur: 0x3b82f6,
  },
];
