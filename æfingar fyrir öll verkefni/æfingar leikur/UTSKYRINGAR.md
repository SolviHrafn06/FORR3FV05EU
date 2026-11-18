# Dularfulla herbergið – útskýringar á kóðanum

Þetta skjal er til að **læra** hvað allt gerir svo þú getir útskýrt það fyrir kennaranum.
Lestu það með `js/main.js`, `js/geimur.js`, `js/hreyfiklippur.js` og `verkfaeri/flytja-hreyfingar.html` opin hlið við hlið. `main.js` er skipt í kafla með fyrirsögnum eins og `// ==================== HLJÓÐ ====================` og hér er vísað í þá kafla og nöfn fallanna.

---

## 0. Hvernig leikurinn virkar

1. Hleðsluskjárinn sýnir stiku á meðan módel, áferðir og hljóð hlaðast. Þegar allt er komið birtist **Byrja**.
2. Smellt er á Byrja: Star Wars merkið flýgur burt inn í þokuna, hljóðin fara í gang og geislasverðið **kviknar**.
3. Anakin gengur með **WASD/örvum** (hleypur með Shift) eða þangað sem **smellt/pikkað** er á gólfið. Hann kemst ekki út fyrir veggina né í gegnum hluti.
4. Sex **B1 battle droidar** standa vakt í röð sitt hvorum megin við hurðina. Þeir anda (mocap idle), halda byssunni á ská niður og skima með höfðinu, hver á sínum hraða.
5. **Bil** heggur með sverðinu. Droid sem er nær en 2,4 m fyrir framan Anakin dettur.
6. Hurðin opnast þegar Anakin gengur að henni.
7. **R2-D2** rúllar á eftir Anakin, vaggar til hliðanna, snýr hvelfingunni að næsta droid og pípir öðru hvoru.
8. Á meðan: ljósin í loftinu **flökta**, könnunar-droidinn í horninu **svífur og snýr sér að Anakin**, Millennium Falcon snýst sem **heilmynd**.

---

### Seinni hlutinn: geimurinn

10. Þegar Anakin er kominn að skipinu birtist **Fara um borð** (eða E).
11. Skjárinn dökknar, Anakin og R2 eru komnir um borð, skipið tekur á loft og flýgur út um opið á austurveggnum.
12. Í geimnum stýrir maður skipinu með mús, fingri eða WASD. TIE flaugar koma í 5 bylgjum, elta skipið, forða sér þegar þær eru of nálægt og skjóta grænum skotum.
13. Eftir 5 bylgjur: „Þú vannst!“. Ef lífið klárast: „Myrka hliðin sigraði“ og „Reyna aftur“ fer aftur í flugskýlið.

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
| | `.crossFadeTo()` milli Idle og Walk/Run | `skiptaUmHreyfingu()` |
| | Veggjamörk með `Math.max` / `Math.min` | skref 4 í `hreyfaAnakin()` |
| | Árekstrar með `.distanceTo()` og `Box3` | `rekstA()` og `anakinRekstA()` |
| 20% | `THREE.Group` / `.add()` sem hreyfast saman | `anakin` (módel + sverð), `myndavelarRig` (myndavél), `droid`, battle droidarnir (`hopur` → `velta` → módel), `hurd`, lampar, súlur, kassastaflar, `holoBord` |
| | Ljósgjafi festur á karakterinn | `sverdLjos` (PointLight) er barn `geislasverd` sem er fest við **handarbein** Anakins |
| | Myndavélin eltir karakterinn | `camera` er barn `myndavelarRig` sem eltir `anakin` í lykkjunni |
| | Hlutur með animation clip (auk karakters) | könnunar-droidinn (`AnimationClip('Svifa', ...)`) og battle droidarnir (mocap `Idle` + `Sentry`) |
| 10% | Eigin 3D hlutur í réttum skala | `gltfLoader.load('models/minn-hlutur.glb', ...)` + `setjaIRettanSkala(hlutur, MINN_HLUTUR_HAED)` |
| 10% | Anime.js með Three.js adapter | `import 'animejs/adapters/three'` og kaflinn **ANIME.JS HREYFINGAR**, auk `sigra()`, `neistar()` og merkisins |
| 10% | `AudioListener`, `AudioLoader`, `Audio`, `PositionalAudio` | kaflinn **HLJÓÐ**, ræst í smelli á Byrja |
| 5% | `LoadingManager` birtir Byrja | kaflinn **HLEÐSLA**: `manager.onProgress` og `manager.onLoad` |

**Athugið:** Anakin módelið kom **án** tilbúinna hreyfinga. Ganga, hlaup og kyrrstaða eru alvöru hreyfiföngun (mocap) af öðru módeli (Xbot) sem var flutt yfir á beinagrind Anakins (sjá kafla 4). Það gæti kennarinn viljað vita.

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
├── battle droid × 6: hopur (Group)     ← stendur á sínum stað
│   ├── velta (Group)                   ← anime.js: rotateX -90 þegar hann er sigraður
│   │   └── afrit af B1 módelinu (SkeletonUtils.clone)
│   └── hljod (PositionalAudio)         ← skot og sprenging
│       (byssan er fest við hægra handarbein B1 og hefur tóman hlut 'hlaup' þar sem skotin koma út)
├── droid (Group)                       ← könnunar-droidinn, .lookAt(anakin)
│   ├── skrokkur (Group)                ← AnimationClip færir hann upp og niður
│   │   ├── kula, auga, midbaugur, augaLjos (PointLight), loftnet
│   │   └── fotur0 … fotur4             ← AnimationClip sveiflar þeim
│   └── droidHljod (PositionalAudio)
├── r2 (Group)                         ← eltir Anakin
│   ├── R2-D2 módelið                   ← vaggar (rotation.z)
│   │   └── r2Hvelfing (Group)          ← snúningsás í miðju hvelfingarinnar, hvelfingin og ljósin hennar
│   └── r2Hljod (PositionalAudio)
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
- **Bloom** (`EffectComposer` → `RenderPass` → `UnrealBloomPass` → `OutputPass`): allt sem er bjartara en hvítt fær ljóma. Þröskuldurinn er 1, svo hlutir sem eiga að ljóma (sverðið, skotin, augað) fá lit sem er margfaldaður upp fyrir 1 með `.multiplyScalar(4)`. Í lykkjunni er `composer.render()` í stað `renderer.render()`.
- Gegnsæir hlutir með `AdditiveBlending` (ljósgeislarnir) eru nú blandaðir í línulegum litum, svo þeir þurfa að vera mjög daufir (`GEISLI_STYRKUR = 0.012`).

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
- `Promise.all([gltfLoader.loadAsync(...), hreyfingaGogn])` bíður eftir bæði módelinu og `hreyfingar.json` (hlaðið með `FileLoader`, sem notar líka manager).
- Mocap klippurnar eru lesnar með `THREE.AnimationClip.parse(...)`. `stillaHrada()` stillir `timeScale` svo fæturnir hreyfist jafn hratt og Anakin færist, svo hann renni ekki eftir gólfinu.
- Hreyfingar hægri handar og fingra eru búnar til með `anakinKlippur(model)` **áður** en módelinu er snúið og það skalað.
- Tvö „lög“ af hreyfingum keyra á sama tíma á sama `mixer`:
  1. `kyrr` / `ganga` / `hlaupa` (mocap): fætur, vinstri hönd, búkur og höfuð. Skipt á milli með `crossFadeTo` í `skiptaUmHreyfingu()`.
  2. `vorn` / `hogg` / `verja`: hægri höndin og fingurnir. `handarHreyfing()` spilar högg eða verja einu sinni (`LoopOnce`) og þegar það klárast (`'finished'` atburður) fer vörnin aftur í gang. `verja` spilast sjálfkrafa þegar skot er slegið til baka.
  Af því að lögin snerta ekki sömu beinin getur Anakin gengið og höggvið í einu.
- **Sverðið fest í lófann:** `mixer.update(0)` setur Anakin í varnarstöðu, lófinn er reiknaður mitt á milli handarbeinsins og fingranna, sverðið sett þar og svo `hond.attach(geislasverd)`.

### DROID (VERAN Í HORNINU)
- Ytri hópurinn `droid` snýr sér með `droid.lookAt(...)` að Anakin. Augað er á `+z` því `lookAt` snýr +z ásnum að markinu.
- **Hreyfiklippan er búin til í kóða** úr `VectorKeyframeTrack('skrokkur.position', ...)` og `NumberKeyframeTrack('fotur0.rotation[x]', ...)`. Nafnið fyrir framan punktinn er `.name` hlutarins sem sporið á við.

### HLJÓÐ
- `AudioListener` er á myndavélinni.
- `THREE.Audio` (umhverfishljóðið) heyrist jafnt alls staðar. `THREE.PositionalAudio` er 3D: það er barn hlutar og heyrist úr réttri átt og hærra þegar maður er nær.
- Hver battle droid fær sitt eigið `PositionalAudio` fyrir sprenginguna þegar hann er högginn.
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
- **`athugaHurd()`**: hurðin rennur í `x = ±2.25` þegar Anakin er nær en 3,5 m.
- **`sigra(o)`**: droidinn dettur aftur á bak (`rotateX: -90` með `outBounce`), sekkur svo í gólfið og er fjarlægður í `onComplete`.
- **`neistar()`**: 14 litlir kassar skjótast út. `y: [byrjun, upp, gólf]` eru keyframes svo þeir fara upp og detta svo niður.
- **Merkið** í byrjun: `z: [-2.2, -45]` á 6 sek, hverfur inn í þokuna.
- **`meidast()`**: rauður skjár blikkar (anime.js virkar líka á HTML).

### R2-D2 (FÉLAGINN)
- Í módelinu hallar R2 sér 22° aftur (göngustaða) og hvelfingin snýst ekki um eigin miðju. Því er búinn til tómur hópur `r2Hvelfing` í miðju hvelfingarinnar, honum hallað eins og búknum (`setFromUnitVectors(upp, upp-ás búksins)`) og hlutar hvelfingarinnar (`dome`, `lenses`, `Cylinder001`) færðir undir hann með `attach()`. Í hverjum ramma: `quaternion = halli · snúningur um y`, svo hausinn snýst um hallandi ásinn eins og á alvöru R2.
- **`uppfaeraR2()`**: markið er `anakin.localToWorld(1, 0, -1.4)`, þ.e. fyrir aftan Anakin og vinstra megin. Hraðinn eykst og minnkar mjúklega (`r2Hradi += (oskHradi - r2Hradi) * ...`), svo hann tekur ekki snögga kippi. Hann notar sömu árekstra og Anakin.
- Hvelfingin snýr að næsta lifandi droid (annars að Anakin) og `r2Model.rotation.z = sin(tími) * ...` lætur hann vagga þegar hann rúllar.

### BATTLE DROIDAR Á VAKT
- B1 módelið er hlaðið einu sinni (`droidSnidmat`). `buaTilByssu()` býr til byssu úr kössum sem er fest við hægra handarbeinið með `attach()`.
- `stillaUppDroidum()` býr til einn droid fyrir hverja stöðu í `DROID_STODUR` með `buaTilDroid(x, z)`, sem afritar módelið með `SkeletonUtils.clone()` (byssan fylgir með). Venjulegt `.clone()` virkar ekki á módel með beinagrind því afritið myndi deila beinunum.
- Tvö lög á hverjum droid: mocap `kyrr` (líkaminn) og `vakt` (hendur og höfuð, úr `hreyfiklippur.js`). Hver byrjar á handahófskenndum stað í klippunum (`action.time`) og `vakt` fær handahófskenndan `timeScale`, svo þeir hreyfa sig ekki allir í takt.
- **`hoggHittir()`**: kallað 200 ms eftir að höggið byrjar. Droid sem er nær en 2,4 m og fyrir framan Anakin dettur (`sigra()`).
- „Reyna aftur“ kallar á `stillaUppDroidum()` svo allir standi aftur.

### MÓDEL Í FLUGSKÝLINU
- `setjaUppHlut(slod, x, z, staerd, snuningur)` hleður módeli, skalar það svo lengsta hliðin verði `staerd` m, setur það á gólfið og bætir `Box3` í `kassar` fyrir árekstra. Svona eru lendingarpallurinn, tölvurnar, rafallinn, rörin, kassinn, tunnurnar og eldsneytisbrúsarnir settir inn.
- Sum módelin eru þjöppuð með **meshopt** svo þau hlaðist hraðar. `gltfLoader.setMeshoptDecoder(MeshoptDecoder)` gerir GLTFLoader kleift að lesa þau.

### SKIPIÐ Í FLUGSKÝLINU, UM BORÐ OG FLUGTAK
- `skyliSkip` stendur á lendingarfótum og vísar út um opið. `skipKassi` (`Box3`) er bæði árekstur og svæðið þar sem **Fara um borð** birtist.
- **`faraUmBord()`** er `async` fall. anime.js hreyfingar eru „thenable“, svo `await animate(...)` bíður þar til hreyfingin klárast: dökkna → fela Anakin og R2 → lýsa → skipið lyftist → flýgur út → dökkna → skipta yfir í geiminn → lýsa.
- **Skipt um senu:** `renderPass.scene = geimur.sena` og `renderPass.camera = geimur.myndavel`. Bloom og allt annað virkar áfram. `geimur.myndavel.add(listener)` færir eyrun yfir á geimmyndavélina.
- `svaedi` ('skyli', 'flugtak', 'geimur') segir hvaða hluti leiksins er í gangi, svo takkar og lykkjan geri rétt.

### STÝRING
- `takkar` er `Set` af tökkum sem er haldið niðri, svo W + A virka saman.
- `pointerdown` + `Raycaster` finnur hvar á gólfinu var smellt → `markmid`.
- **`hreyfaAnakin(delta)`**: 1) finna stefnu, 2) snúa mjúklega (`Math.atan2`), 3) færa einn ás í einu og athuga árekstra, svo hann renni meðfram hlutum, 4) `Math.max`/`Math.min` fyrir veggina.

### LYKKJAN
`timer.update()` → `timer.getDelta()` (max 0,1 sek) → hreyfa Anakin → hurð og „Fara um borð“ → droidar → R2 → `mixer.update()` → `droid.lookAt()` → myndavélin eltir (`lerp`) → `render`.

---

## 4. `geimur.js`: geimurinn

`buaTilGeimsins({...})` býr til allt og skilar viðmóti (`sena`, `myndavel`, `byrja()`, `stoppa()`, `uppfaera()`, `skjota()`, `hradaukning()`). main.js sendir inn það sem geimurinn þarf frá hinum hlutanum (`meidast`, `spila`, `listener` o.fl.).

- **Senan:** stjörnur (`Points` á stórri kúlu), stjörnuþokur (`Sprite` með mjúkum bletti teiknuðum á `canvas`), pláneta með `CanvasTexture` og lofthjúpi (stærri kúla, `BackSide`, `AdditiveBlending`), 70 loftsteinar (íkosahedra þar sem hornpunktarnir eru færðir til af handahófi, `mergeVertices` svo engar rifur myndist).
- **Geimryk:** 500 punktar nálægt skipinu. Punktur sem fer meira en 60 m frá skipinu er færður hinum megin, svo það er alltaf ryk í kringum skipið og maður sér hraðann.
- **Flugið (`fljuga()`):** `skip.rotation.order = 'YXZ'`: snúið til hliðar um y (beygja) og upp/niður um x (takmarkað við ±69°), svo sjóndeildarhringurinn helst beinn og það er auðvelt að stýra. `skipHalli` hallar skipinu inn í beygjur (bara útlit). Beygjuhraðinn nálgast það sem beðið er um smám saman (tregða). Áfram: `Z_AS.applyQuaternion(skip.quaternion)`.
- **Myndavélin** eltir skipið: staða `skip.localToWorld(0, 3, -12)` með `lerp`, horfir á punkt 40 m fyrir framan. Sjónsviðið (`fov`) stækkar með hraðanum.
- **Skot:** tvær byssur til skiptis. Miðunaraðstoð: ef TIE er nær en ~8° frá stefnu skipsins er miðað þangað sem hún *verður* þegar skotið nær henni. Árekstrar með `Line3` eins og í flugskýlinu.
- **TIE gervigreind (`uppfaeraTie()`):** tvær stöður. *atak:* fljúga að skipinu og skjóta ef það er beint fyrir framan (með smá skekkju). *forda:* ef nær en 40 m, fljúga burt í handahófskennda átt í 2–3,5 sek. `quaternion.rotateTowards()` takmarkar hversu hratt hún getur beygt.
- **Sprengingar:** blossi (kúla sem stækkar og dofnar) og brak sem flýgur út og snýst, allt með anime.js.
- **Merki á skjánum:** staða hverrar TIE er varpað á skjáinn með `.project(myndavel)`. Ef hún er fyrir aftan eða utan skjás birtist ör við jaðarinn.
- **Þrjár gerðir af TIE** í `TIE_GERDIR`: venjuleg TIE, Interceptor (hraðari, beygir krappar) og Bomber (hægur, 6 líf). `BYLGJUR` segir hvaða flaugar eru í hverri af 5 bylgjunum. Þær birtast hjá Star Destroyernum og fljúga þaðan að skipinu.
- **Stórir hlutir:** Star Destroyer, geimstöðin og Dauðastjarnan eru hlaðnir með `hladaStorum()`. Hver fær nokkrar árekstrarkúlur (`storirHlutir`), svo skipið skoppar af þeim.
- **Bakgrunnur:** stjörnukort NASA er `sena.background` með `EquirectangularReflectionMapping` (allur himinninn í einni mynd).
- **Loftsteinar:** íkosahedrarnir fá lögun NASA loftsteinanna (Bennu, Eros, Itokawa) þegar þær hafa hlaðist: `geometry.center()`, skalað í radíus 1 og `computeVertexNormals()`.
- **Sprengingar:** Kenney myndin hefur 8 reiti (4 x 2). Hver reitur er afrit af áferðinni með `repeat` (0,25, 0,5) og `offset` sem velur reitinn. Glampi, tveir eldar og reykur eru `Sprite` sem stækka og dofna með anime.js.

---

## 5. Hreyfingarnar: mocap + beinagrind

Anakin og B1 komu með beinagrind (bein fyrir læri, hné, handleggi …) en **engar hreyfingar**.

### Mocap (`verkfaeri/flytja-hreyfingar.html` → `hreyfingar/hreyfingar.json`)

Xbot módelið í dæmum three.js er með alvöru hreyfingar (idle, walk, run) teknar upp með hreyfiföngun. Verkfærið færir þær yfir á Anakin og B1. Það var keyrt einu sinni í vafra og niðurstaðan vistuð í `hreyfingar.json`, svo leikurinn þarf ekki að gera þetta í hvert skipti.

1. `ANAKIN_KORT` segir hvaða bein samsvara: `mixamorigLeftUpLeg` → `ValveBipedBip01_L_Thigh_055` o.s.frv. Hægri hönd Anakins er ekki með (hún heldur á sverðinu) og hendur B1 ekki heldur (þær halda á byssunni).
2. Bæði módelin standa í T-stellingu í hvíld og snúa eins. Fyrir hvern ramma og hvert bein:
   ```
   breyting = snúningur Xbot-beinsins núna · (snúningur þess í hvíld)⁻¹     (í heimshnitum)
   nýtt     = breyting · snúningur Anakin-beinsins í hvíld
   staðbundið = (snúningur foreldris)⁻¹ · nýtt
   ```
   Foreldrar eru reiknaðir á undan börnum svo „snúningur foreldris“ sé þegar réttur.
3. Mjaðmirnar færast líka upp og niður. Sú hreyfing er skölun eftir hæð mjaðmanna (Anakin er með styttri fætur en Xbot).
4. `hradiKlippu()` mælir hversu hratt Xbot gengur (hversu langt fóturinn fer aftur á meðan hann stendur í gólfinu). Leikurinn notar það í `stillaHrada()`.

### Hendur og fingur (`js/hreyfiklippur.js`)

Það sem mocap-ið hefur ekki er búið til í kóða með því að snúa beinum um ása módelsins:

```js
{ bein: 'ValveBipedBip01_R_UpperArm_015', as: 'x', midja: 82 }          // hægri hönd niður
{ bein: 'ValveBipedBip01_R_UpperArm_015', as: 'x', lyklar: [82, 15, 60, 82] }   // högg: vörn → lyfta → höggva → vörn
```

- `midja` / `sveifla` / `fasi`: horn = midja + sveifla · sin(2π · t / lengd + fasi)
- `lyklar`: horn sem dreifast jafnt yfir klippuna
- `fingur('R', 65)`: hver fingurliður á hægri hendi kreppist um 65° utan um skaftið

`buaTilKlippu()` umreiknar hvern snúning úr hnitum módelsins í hnit beinsins (`P⁻¹ · R · P · hvíldarstaða`, P = snúningur foreldris) og býr til `QuaternionKeyframeTrack`.

---

## 6. Ef eitthvað lítur skringilega út

| Vandamál | Lausn |
| --- | --- |
| Of stór / lítill | `ANAKIN_HAED` / `DROID_HAED` |
| Of erfitt / létt | `SKOT_HRADI`, `DROID_HRADI`, `meidast(10)` eða `0.35` í vörninni í `uppfaeraSkot()` |
| Sverðið vísar skringilega | `SVERD_HALLI_X` og `SVERD_HALLI_Z` |
| Höndin er á röngum stað | hornin í `VORN` í `hreyfiklippur.js` |
| Hægt á síma | taktu `castShadow` af `sverdLjos` (punktljós með skuggum teiknar senuna 6 sinnum) |
