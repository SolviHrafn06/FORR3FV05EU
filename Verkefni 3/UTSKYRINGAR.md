# Dularfulla herbergið – útskýringar á kóðanum

Þetta skjal er til að **læra** hvað allt gerir svo þú getir útskýrt það fyrir kennaranum.
Lestu það með `js/main.js` og `js/hreyfiklippur.js` opin hlið við hlið. `main.js` er skipt í kafla með fyrirsögnum eins og `// ==================== HLJÓÐ ====================` og hér er vísað í þá kafla og nöfn fallanna.

---

## 0. Hvernig leikurinn virkar

1. Hleðsluskjárinn sýnir stiku á meðan módel, áferðir og hljóð hlaðast. Þegar allt er komið birtist **Byrja**.
2. Smellt er á Byrja: Star Wars merkið flýgur burt inn í þokuna, hljóðin fara í gang og geislasverðið **kviknar**.
3. Anakin gengur með **WASD/örvum** (hleypur með Shift) eða þangað sem **smellt/pikkað** er á gólfið. Hann kemst ekki út fyrir veggina né í gegnum hluti.
4. Eftir 6 sekúndur opnast hurðin og **B1 battle droidar** ganga inn. Þegar þeir eru 6 m frá Anakin stoppa þeir, miða og skjóta.
5. Ef sverðið logar og Anakin snýr að skotinu **slær hann það til baka** í droidinn, sem dettur. Annars missir hann 10 líf.
6. **Bil** heggur með sverðinu. Droid sem er nær en 2,4 m fyrir framan Anakin dettur.
7. Þegar lífið klárast birtist „Myrka hliðin sigraði“ og hægt er að reyna aftur.
8. Á meðan: ljósin í loftinu **flökta**, könnunar-droidinn í horninu **svífur og snýr sér að Anakin**, Millennium Falcon snýst sem **heilmynd**.

---

## 1. Hvar er hver krafa uppfyllt?

| Vægi | Krafa | Hvar |
| --- | --- | --- |
| 20% | Gólf, veggir og hlutir úr grunnformum | **HERBERGIÐ** (`PlaneGeometry`, `BoxGeometry`) og **SÚLUR, KASSAR, STALLUR OG HEILMYNDARBORÐ** (`CylinderGeometry`, `BoxGeometry`) |
| | Efni og áferðir | `MeshStandardMaterial`, `MeshBasicMaterial`, `aferd()` hleður `golf.png` og `veggur.png` með `TextureLoader` |
| | Lýsing og skuggar | `HemisphereLight`, þrír `SpotLight` í `buaTilLampa()`, `PointLight` í sverðinu, droid-auganu og ganginum. `castShadow` / `receiveShadow` |
| | Þoka | `scene.fog = new THREE.FogExp2(...)` |
| 25% | Tilbúið 3D módel af karakter | `gltfLoader.load('models/anakin_skywalker__battlefront_ii/scene.gltf', ...)` |
| | WASD, örvar, Pointer Events, Raycaster | `keydown`/`keyup` í **STÝRING**, `pointerdown` + `raycaster.intersectObject(golf)` |
| | `AnimationMixer` og `THREE.Timer` | `mixer = new THREE.AnimationMixer(model)`, í lykkjunni `timer.update()` og `timer.getDelta()` |
| | `.crossFadeTo()` milli Idle og Walk/Run | `skiptaUmHreyfingu()` (Anakin) og `droidSkiptir()` (battle droidar) |
| | Veggjamörk með `Math.max` / `Math.min` | skref 4 í `hreyfaAnakin()` |
| | Árekstrar með `.distanceTo()` og `Box3` | `rekstA()` og `anakinRekstA()` |
| 20% | `THREE.Group` / `.add()` sem hreyfast saman | `anakin` (módel + sverð), `myndavelarRig` (myndavél), `droid`, battle droidarnir (`hopur` → `velta` → módel), `hurd`, lampar, súlur, kassastaflar, `holoBord` |
| | Ljósgjafi festur á karakterinn | `sverdLjos` (PointLight) er barn `geislasverd` sem er fest við **handarbein** Anakins |
| | Myndavélin eltir karakterinn | `camera` er barn `myndavelarRig` sem eltir `anakin` í lykkjunni |
| | Hlutur með animation clip (auk karakters) | könnunar-droidinn (`AnimationClip('Svifa', ...)`) og battle droidarnir (`March`, `Aim`) |
| 10% | Eigin 3D hlutur í réttum skala | `gltfLoader.load('models/minn-hlutur.glb', ...)` + `setjaIRettanSkala(hlutur, MINN_HLUTUR_HAED)` |
| 10% | Anime.js með Three.js adapter | `import 'animejs/adapters/three'` og kaflinn **ANIME.JS HREYFINGAR**, auk `sigra()`, `neistar()` og merkisins |
| 10% | `AudioListener`, `AudioLoader`, `Audio`, `PositionalAudio` | kaflinn **HLJÓÐ**, ræst í smelli á Byrja |
| 5% | `LoadingManager` birtir Byrja | kaflinn **HLEÐSLA**: `manager.onProgress` og `manager.onLoad` |

**Athugið:** Anakin módelið kom **án** tilbúinna hreyfinga. Hreyfingarnar eru búnar til í kóða úr beinagrind þess (sjá kafla 4). Það gæti kennarinn viljað vita.

---

## 2. Scene graph (hver er barn hvers)

Allt sem er inndregið undir einhverju hreyfist með því.

```
scene
├── myndavelarRig (Group)               ← eltir Anakin
│   └── camera
│       ├── listener (AudioListener)      ← eyrun
│       └── merkiHopur                    ← Star Wars merkið (flýgur burt í byrjun)
├── anakin (Group)                      ← þetta er það sem færist þegar þú gengur
│   └── model (Anakin)                  ← AnimationMixer spilar hreyfingarnar á beinunum
│       └── … ValveBipedBip01_R_Hand_017 (hægra handarbein)
│           └── geislasverd (Group)     ← fylgir hendinni í öllum hreyfingum
│               ├── skaftHopur (anakin_lightsaber.glb)
│               ├── blad (Group)        ← anime.js: scaleY 0 → 1 þegar kviknar
│               ├── sverdLjos (PointLight)
│               └── sverdHljod, kveikjaHljod, sveifluHljod, endurkastHljod (PositionalAudio)
├── battle droid × N: hopur (Group)     ← lookAt + færist
│   ├── velta (Group)                   ← anime.js: rotateX -90 þegar hann er sigraður
│   │   └── afrit af B1 módelinu (SkeletonUtils.clone)
│   └── hljod (PositionalAudio)         ← skot og sprenging
├── droid (Group)                       ← könnunar-droidinn, .lookAt(anakin)
│   ├── skrokkur (Group)                ← AnimationClip færir hann upp og niður
│   │   ├── kula, auga, midbaugur, augaLjos (PointLight), loftnet
│   │   └── fotur0 … fotur4             ← AnimationClip sveiflar þeim
│   └── droidHljod (PositionalAudio)
├── holoBord (Group)
│   └── holoHaldari                     ← anime.js snýr honum
│       └── millennium_falcon.glb
├── stallur → hlutHaldari               ← minn-hlutur.glb fer hingað
├── hurd → vinstriHurd, haegriHurd, hurdHljod
├── lampi × 3, súla × 3, kassastafli × 2
└── veggir (með ljósarendur sem börn), golf, loft, gangur, leysiskot …
```

**Af hverju er myndavélin ekki beint barn `anakin`?** Þá myndi hún snúast í hring í hvert sinn sem Anakin snýr sér og W myndi þýða mismunandi átt. `myndavelarRig` færist á eftir Anakin en snýst aldrei.

**Af hverju er sverðið fest við handarbeinið en ekki `anakin` hópinn?** Þá fylgir það hendinni þegar hann heggur. `hond.attach(geislasverd)` færir sverðið undir beinið án þess að það hreyfist í heiminum.

---

## 3. Kaflarnir í `main.js`

### RENDERER, SENA OG MYNDAVÉL
- `renderer.shadowMap.enabled = true` kveikir á skuggum. Hver hlutur þarf líka `castShadow` (varpar) eða `receiveShadow` (tekur við).
- `FogExp2(litur, þéttleiki)`: því lengra sem hlutur er frá myndavélinni, því meira hverfur hann í þokuna.
- `scene.environment` (RoomEnvironment): dauft „umhverfi“ sem málmar endurspegla. Án þess verða málmhlutir eins og droidarnir kolsvartir.

### HLEÐSLA (LoadingManager)
- Einn `LoadingManager` er sendur inn í alla loaderana (`GLTFLoader`, `TextureLoader`, `AudioLoader`), svo hann veit um allar skrár.
- `onProgress` stækkar stikuna, `onLoad` birtir Byrja þegar **allt** er komið.
- `setjaIRettanSkala()` mælir hlut með `Box3`, skalar hann í rétta hæð og lætur hann standa á `y = 0`. `setjaIMidju()` gerir það sama en miðjusetur hlutinn (fyrir Fálkann og merkið).

### ÁREKSTRAR
- **Hringlaga hlutir** (súlur, stallur, borð, könnunar-droid) eru `{ midja, radius }`. Ef `stada.distanceTo(midja) < radius + radíus Anakins` rekast þeir á.
- **Kassar** eru `THREE.Box3`. `kassi.distanceToPoint(stada)` gefur fjarlægðina í næsta punkt kassans.
- `anakinRekstA()` athugar líka battle droidana, svo Anakin gengur ekki í gegnum þá.

### HERBERGIÐ
- **Veggirnir eru einhliða plön sem snúa inn.** Three.js teiknar bara framhlið plana, svo þegar myndavélin er fyrir utan suðurvegginn sér hún í gegnum hann.
- Norðurveggurinn er úr þremur bútum svo það sé gat fyrir hurðina. Fyrir aftan er `gangur` (kassi með `side: THREE.BackSide`) sem droidarnir koma úr.

### SÚLUR, KASSAR, STALLUR OG HEILMYNDARBORÐ
- Súlur og kassastaflar eru `Group` úr einföldum formum. Litli kassinn er barn staflans.
- Heilmyndin: öll efni Fálkans eru skipt út fyrir eitt `holoEfni` (gegnsætt, blátt, `AdditiveBlending`). Þannig lítur það út eins og ljós.

### ANAKIN OG GEISLASVERÐIÐ
- **Skaftið** (`anakin_lightsaber.glb`) er á ská í módelinu og með sínu eigin blaði. Kóðinn notar endana á innbyggða blaðinu (`Laser`) til að finna í hvaða átt það vísar, tekur blaðið burt og snýr skaftinu upp með `quaternion.setFromUnitVectors(stefna, upp)`. Svo er okkar eigið blað notað, því það getur kviknað og slokknað.
- **Hreyfingarnar** eru búnar til með `anakinKlippur(model)` (sjá kafla 4) **áður** en módelinu er snúið og það skalað.
- Tvö „lög“ af hreyfingum keyra á sama tíma á sama `mixer`:
  1. `kyrr` / `ganga` / `hlaupa`: fætur, vinstri hönd og búkur. Skipt á milli með `crossFadeTo` í `skiptaUmHreyfingu()`.
  2. `vorn` / `hogg`: bara hægri höndin. Höggið er `LoopOnce` og þegar það klárast (`'finished'` atburður) fer vörnin aftur í gang.
  Af því að lögin snerta ekki sömu beinin getur Anakin gengið og höggvið í einu.
- **Sverðið fest í lófann:** `mixer.update(0)` setur Anakin í varnarstöðu, lófinn er reiknaður mitt á milli handarbeinsins og fingranna, sverðið sett þar og svo `hond.attach(geislasverd)`.

### DROID (VERAN Í HORNINU)
- Ytri hópurinn `droid` snýr sér með `droid.lookAt(...)` að Anakin. Augað er á `+z` því `lookAt` snýr +z ásnum að markinu.
- **Hreyfiklippan er búin til í kóða** úr `VectorKeyframeTrack('skrokkur.position', ...)` og `NumberKeyframeTrack('fotur0.rotation[x]', ...)`. Nafnið fyrir framan punktinn er `.name` hlutarins sem sporið á við.

### HLJÓÐ
- `AudioListener` er á myndavélinni.
- `THREE.Audio` (umhverfishljóðið) heyrist jafnt alls staðar. `THREE.PositionalAudio` er 3D: það er barn hlutar og heyrist úr réttri átt og hærra þegar maður er nær.
- Hver battle droid fær sitt eigið `PositionalAudio`, en þeir deila sömu `bufferar.blaster` og `bufferar.sprenging`.
- Vafrar leyfa ekki hljóð fyrr en notandi smellir, þess vegna er `listener.context.resume()` í smelli á Byrja.

### ANIME.JS HREYFINGAR
`import 'animejs/adapters/three'` skráir Three.js adapterinn. Eftir það skilur `animate()` Three hluti beint:

| Í anime.js | Í Three.js |
| --- | --- |
| `x`, `y`, `z` | `position.x/y/z` |
| `rotateX`, `rotateY`, `rotateZ` (gráður) | `rotation` (radíanar) |
| `scale`, `scaleY` | `scale` |
| `opacity` | `material.opacity` |
| `intensity` | `light.intensity` |

- **`flokta(lampi)`**: velur af handahófi blikk eða smá birtubreytingu og kallar á sjálft sig í `onComplete`, svo flöktið er alltaf óreglulegt.
- **`holoFlokt()`**: heilmyndin dofnar snöggt öðru hvoru, eins og slæm sending.
- **Augað** púlsar (`loop: true, alternate: true`), **heilmyndin og hluturinn** snúast (`rotateY: 360`, `ease: 'linear'`).
- **`kveikjaASverdi()`**: `scaleY` blaðsins 0 ↔ 1 og `intensity` ljóssins 0 ↔ 8.
- **`athugaHurd()`**: hurðin rennur í `x = ±2.25` þegar Anakin eða droid er nær en 4,5 m.
- **`sigra(o)`**: droidinn dettur aftur á bak (`rotateX: -90` með `outBounce`), sekkur svo í gólfið og er fjarlægður í `onComplete`.
- **`neistar()`**: 14 litlir kassar skjótast út. `y: [byrjun, upp, gólf]` eru keyframes svo þeir fara upp og detta svo niður.
- **Merkið** í byrjun: `z: [-2.2, -45]` á 6 sek, hverfur inn í þokuna.
- **`meidast()`**: rauður skjár blikkar (anime.js virkar líka á HTML).

### BATTLE DROIDAR (ÓVINIR)
- B1 módelið er hlaðið einu sinni (`droidSnidmat`). `buaTilOvin()` býr til afrit með `SkeletonUtils.clone()`. Venjulegt `.clone()` virkar ekki á módel með beinagrind því afritið myndi deila beinunum.
- Hver droid er `{ hopur, velta, mixer, ganga, mida, virk, hljod, lifandi, naestaSkot }` í fylkinu `ovinir`.
- **`uppfaeraOvini()`** í hverjum ramma: ef droidinn er enn í ganginum eða lengra en 6 m frá Anakin gengur hann (`ganga`). Annars stoppar hann, miðar (`mida`, skipt með `crossFadeTo`) og skýtur á 1,6–3 sek fresti.
- **`skjota()`**: býr til leysiskot sem flýgur í átt að brjósti Anakins.
- **`uppfaeraSkot()`**: færir skotin. Í stað þess að athuga bara nýju stöðuna er athugað hvort `THREE.Line3` frá gömlu stöðunni í þá nýju fari nálægt Anakin. Annars gæti hratt skot flogið í gegnum hann á hægri tölvu.
  - **Vörn:** `framAnakins()` er stefnan sem hann snýr í. Ef `fram · (átt sem skotið kom úr) > 0.35` (minna en ~70° á milli) og sverðið logar snýr skotið við í átt að droidnum sem skaut.
- **`hoggHittir()`**: kallað 200 ms eftir að höggið byrjar. Sigrar droida sem eru nær en 2,4 m og fyrir framan Anakin.
- Nýir droidar koma oftar og fleiri í einu eftir því sem `stig` hækka (í lykkjunni).

### STÝRING
- `takkar` er `Set` af tökkum sem er haldið niðri, svo W + A virka saman.
- `pointerdown` + `Raycaster` finnur hvar á gólfinu var smellt → `markmid`.
- **`hreyfaAnakin(delta)`**: 1) finna stefnu, 2) snúa mjúklega (`Math.atan2`), 3) færa einn ás í einu og athuga árekstra, svo hann renni meðfram hlutum, 4) `Math.max`/`Math.min` fyrir veggina.

### LYKKJAN
`timer.update()` → `timer.getDelta()` (max 0,1 sek) → hreyfa Anakin → kannski nýr droid → hurð → droidar → skot → `mixer.update()` → `droid.lookAt()` → myndavélin eltir (`lerp`) → `render`.

---

## 4. `hreyfiklippur.js`: hreyfingar úr beinagrind

Anakin og B1 komu með beinagrind (bein fyrir læri, hné, handleggi …) en **engar hreyfingar**. Þetta skjal býr þær til.

**Hugmyndin:** hvert bein sveiflast eins og sínusbylgja:

```
horn = midja + sveifla · sin(2π · t / lengd + fasi)
```

Dæmi úr göngunni:
```js
{ bein: 'ValveBipedBip01_R_Thigh_052', as: 'z', sveifla: 24 }            // hægra læri ±24°
{ bein: 'ValveBipedBip01_L_Thigh_055', as: 'z', sveifla: 24, fasi: H }   // vinstra læri á móti (H = π)
```

**Ásarnir** eru ásar módelsins í hvíldarstöðu: x = fram, y = upp, z = til hægri. Fótur sem vísar niður fer **fram** þegar honum er snúið jákvætt um z.

**Stærðfræðin í `buaTilKlippu()`:** hvert bein á sinn eigin snúning (`bein.quaternion`) miðað við foreldrið sitt. Til að snúa beininu um ás *módelsins* þarf að umreikna:

```
nýr snúningur = P⁻¹ · R · P · hvíldarstaða
```

- `P` = hvernig foreldri beinsins snýr í hnitum módelsins
- `R` = snúningurinn sem við viljum (t.d. 24° um z)
- `P⁻¹ · R · P` breytir R úr hnitum módelsins yfir í hnit foreldrisins

Þetta er reiknað fyrir 17 tímapunkta og sett í `QuaternionKeyframeTrack`. Úr þeim verður `AnimationClip` sem `AnimationMixer` spilar alveg eins og innbyggða hreyfingu.

Fyrir **höggið** (gerist bara einu sinni) eru notaðir `lyklar` í stað sínusbylgju: `[82, 15, 60, 82]` þýðir byrja í vörn, lyfta, höggva, aftur í vörn.

---

## 5. Ef eitthvað lítur skringilega út

| Vandamál | Lausn |
| --- | --- |
| Of stór / lítill | `ANAKIN_HAED` / `DROID_HAED` |
| Of erfitt / létt | `SKOT_HRADI`, `DROID_HRADI`, `meidast(10)` eða `0.35` í vörninni í `uppfaeraSkot()` |
| Sverðið vísar skringilega | `SVERD_HALLI_X` og `SVERD_HALLI_Z` |
| Höndin er á röngum stað | hornin í `VORN` í `hreyfiklippur.js` |
| Hægt á síma | taktu `castShadow` af `sverdLjos` (punktljós með skuggum teiknar senuna 6 sinnum) |
