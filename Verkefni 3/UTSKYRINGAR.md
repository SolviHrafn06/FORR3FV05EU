# Dularfulla herbergið – útskýringar á kóðanum

Þetta skjal er til að **læra** hvað allt gerir svo þú getir útskýrt það fyrir kennaranum.
Lestu það með `index.html` og `js/main.js` opin hlið við hlið. `main.js` er skipt í kafla með fyrirsögnum eins og `// ==================== HLJÓÐ ====================` og hér er vísað í þá kafla og nöfn fallanna.

---

## 0. Hvernig leikurinn virkar

1. Hleðsluskjárinn sýnir stiku á meðan módel, áferðir og hljóð hlaðast. Þegar allt er komið birtist **Byrja**.
2. Smellt er á Byrja: umhverfishljóðið og droid-suðið fara í gang og geislasverðið **kviknar** (blaðið vex upp úr skaftinu og ljósið kviknar).
3. Anakin gengur með **WASD/örvum** (hleypur með Shift) eða gengur þangað sem **smellt/pikkað** er á gólfið.
4. Hann kemst ekki út fyrir veggina né í gegnum súlur, kassa, stallinn eða droidinn.
5. Ljósin í loftinu **flökta** óreglulega, droidinn í horninu **svífur** og **snýr sér alltaf að Anakin**, rauða augað púlsar.
6. Þegar Anakin nálgast hurðina **rennur hún til hliðar**, hvæs heyrist og rauður gangur kemur í ljós.
7. **Bil** sveiflar sverðinu og **F** kveikir/slekkur á því. Þegar slökkt er verður Anakin að skuggamynd í myrkrinu.

---

## 1. Hvar er hver krafa uppfyllt?

| Vægi | Krafa | Hvar í `main.js` |
| --- | --- | --- |
| 20% | Gólf, veggir og hlutir úr grunnformum | kaflinn **HERBERGIÐ** (`PlaneGeometry`, `BoxGeometry`) og **SÚLUR, KASSAR OG STALLUR** (`CylinderGeometry`, `BoxGeometry`) |
| | Efni og áferðir | `MeshStandardMaterial`, `MeshBasicMaterial`, `aferd()` hleður `golf.png` og `veggur.png` með `TextureLoader` |
| | Lýsing og skuggar | `HemisphereLight`, þrír `SpotLight` lampar í `buaTilLampa()`, `PointLight` í sverðinu, droid-auganu og ganginum. `castShadow` / `receiveShadow` |
| | Þoka | `scene.fog = new THREE.FogExp2(...)` |
| 25% | Tilbúið `.glb` módel af karakter | `gltfLoader.load('models/anakin.glb', ...)` |
| | WASD, örvar, Pointer Events, Raycaster | `keydown`/`keyup` í **STÝRING**, `pointerdown` + `raycaster.intersectObject(golf)` |
| | `AnimationMixer` og `THREE.Timer` | `mixer = new THREE.AnimationMixer(model)`, í lykkjunni `timer.update()` og `timer.getDelta()` |
| | `.crossFadeTo()` milli Idle og Walk/Run | `skiptaUmHreyfingu()` |
| | Veggjamörk með `Math.max` / `Math.min` | skref 4 í `hreyfaAnakin()` |
| | Árekstrar með `.distanceTo()` og `Box3` | `rekstA()` |
| 20% | `THREE.Group` / `.add()` sem hreyfast saman | `anakin` hópurinn (módel + `geislasverd`), `myndavelarRig` (myndavél), `droid` (skrokkur, fætur, auga, ljós), `hurd`, lampar, súlur, kassastaflar, stallur |
| | Ljósgjafi festur á karakterinn | `sverdLjos` (PointLight) er barn `geislasverd` sem er barn `anakin` |
| | Myndavélin eltir karakterinn | `camera` er barn `myndavelarRig` sem eltir `anakin` í lykkjunni |
| | Hlutur með animation clip (auk karakters) | droidinn: `new THREE.AnimationClip('Svifa', ...)` spilað með `droidMixer` |
| 10% | Eigin 3D hlutur í réttum skala | `gltfLoader.load('models/minn-hlutur.glb', ...)` + `setjaIRettanSkala(hlutur, MINN_HLUTUR_HAED)` |
| 10% | Anime.js með Three.js adapter | `import 'animejs/adapters/three'` og kaflinn **ANIME.JS HREYFINGAR**: `flokta()`, augað, hluturinn snýst, `kveikjaASverdi()`, `sveifla()`, `athugaHurd()`, `synaMerki()` |
| 10% | `AudioListener`, `AudioLoader`, `Audio`, `PositionalAudio` | kaflinn **HLJÓÐ**, ræst í smelli á Byrja |
| 5% | `LoadingManager` birtir Byrja | kaflinn **HLEÐSLA**: `manager.onProgress` og `manager.onLoad` |

---

## 2. Scene graph (hver er barn hvers)

Allt sem er inndregið undir einhverju hreyfist með því. Ef `anakin` færist eða snýst fylgir sverðið, ljósið og hljóðin með.

```
scene
├── myndavelarRig (Group)            ← eltir Anakin
│   └── camera
│       └── listener (AudioListener)   ← eyrun
├── anakin (Group)                   ← þetta er það sem hreyfist þegar þú gengur
│   ├── model (anakin.glb)           ← AnimationMixer spilar hreyfingarnar á þessu
│   └── geislasverd (Group)          ← anime.js sveiflar þessu (rotateX / rotateZ)
│       ├── skaft
│       ├── blad (Group)             ← anime.js: scaleY 0 → 1 þegar kviknar
│       │   ├── kjarni
│       │   └── ljomi
│       ├── sverdLjos (PointLight)   ← ljósgjafinn í hendinni, varpar skuggum
│       └── sverdHljod, kveikjaHljod, sveifluHljod (PositionalAudio)
├── droid (Group)                    ← .lookAt(anakin) í hverjum ramma
│   ├── skrokkur (Group)             ← AnimationClip færir hann upp og niður
│   │   ├── kula, auga, midbaugur, litlu augun, loftnet
│   │   ├── augaLjos (PointLight)    ← anime.js púlsar intensity
│   │   └── fotur0 … fotur4 (Group)  ← AnimationClip sveiflar þeim
│   └── droidHljod (PositionalAudio)
├── hurd (Group)
│   ├── vinstriHurd, haegriHurd      ← anime.js renna þeim til hliðar (x)
│   └── hurdHljod (PositionalAudio)
├── lampi × 3 (Group)                ← hús, pera, SpotLight + target, ljósgeisli
├── súla × 3 (Group)                 ← fótur, skaft, toppur, ljóshringur
├── kassastafli × 2 (Group)          ← stór kassi + lítill kassi ofan á
├── stallur (Group)
│   └── hlutHaldari (Group)          ← anime.js snýr honum, minn-hlutur.glb fer hingað
├── veggir (Mesh) → ljósarendur sem börn
└── golf, loft, gangur …
```

**Af hverju er myndavélin ekki beint barn `anakin`?** Þá myndi hún snúast í hring í hvert sinn sem Anakin snýr sér og W myndi þýða mismunandi átt. Í staðinn er hún barn `myndavelarRig`, sem færist á eftir Anakin en snýst aldrei. Þannig þýðir W alltaf „inn í herbergið“.

---

## 3. Kaflarnir í `main.js`

### STILLINGAR
Fastar sem auðvelt er að breyta: stærð herbergisins, hæð Anakins (1,85 m), gönguhraði, hæð skannaða hlutarins o.fl. `MORK` er hversu langt Anakin kemst að veggnum (hálft herbergi mínus radíusinn hans).

### RENDERER, SENA OG MYNDAVÉL
- `renderer.shadowMap.enabled = true` kveikir á skuggum. Hver hlutur þarf líka `castShadow` (varpar) eða `receiveShadow` (tekur við).
- `ACESFilmicToneMapping` gerir björt ljós mýkri, eins og í bíómynd.
- `FogExp2(litur, þéttleiki)`: því lengra sem hlutur er frá myndavélinni, því meira hverfur hann inn í þokulitinn. Bakgrunnurinn er sami litur svo það sjáist ekki hvar þokan endar.

### HLEÐSLA (LoadingManager)
- Einn `LoadingManager` er búinn til og **sendur inn í alla loaderana** (`GLTFLoader`, `TextureLoader`, `AudioLoader`). Þannig veit hann um allar skrár.
- `onProgress(slod, buid, alls)` er kallað eftir hverja skrá → stikan stækkar.
- `onLoad` er kallað þegar **allt** er komið → Byrja takkinn birtist (`hidden = false`).
- `aferd()` hleður áferð og stillir `RepeatWrapping` + `repeat` svo myndin endurtaki sig (gólfið er 20 m og myndin er 4 m → `repeat` 5).
- `setjaIRettanSkala()` mælir hlutinn með `Box3`, reiknar `s = óskuð hæð / raunhæð`, skalar hann og færir hann svo botninn sé á `y = 0` og miðjan á x og z sé í 0. Sama fallið er notað fyrir Anakin og skannaða hlutinn.

### ÁREKSTRAR
`rekstA(stada)` skilar `true` ef staðan rekst á eitthvað:
- **Hringlaga hlutir** (súlur, stallur, droid) eru geymdir sem `{ midja, radius }`. Ef `stada.distanceTo(midja) < radius + ANAKIN_RADIUS` þá skarast hringirnir.
- **Kassar** eru geymdir sem `THREE.Box3` (búið til með `setFromObject(stafli)`). `kassi.distanceToPoint(stada)` gefur fjarlægðina frá Anakin að næsta punkti kassans.

### HERBERGIÐ
- Gólf og loft eru `PlaneGeometry` sem er snúið um x-ásinn (`rotation.x = ±Math.PI / 2`).
- **Veggirnir eru einhliða plön sem snúa inn.** Three.js teiknar bara framhlið plana. Þegar myndavélin er fyrir utan suðurvegginn (hún er alltaf fyrir aftan Anakin) sér hún bakhlið hans, sem er ekki teiknuð, og sér því inn í herbergið.
- Norðurveggurinn er úr þremur bútum svo það sé gat fyrir hurðina. Fyrir aftan er `gangur`, kassi með `side: THREE.BackSide` svo hann sjáist að innan.
- `ljosarendur()` bætir lýsandi röndum á vegginn **sem börnum hans** (`veggur.add(rond)`), þannig að þær fylgja veggnum.

### SÚLUR, KASSAR OG STALLUR
- `buaTilSulu()` býr til `Group` úr fjórum sívalningum og bætir súlunni í `hindranir`.
- `buaTilKassastafla()` setur lítinn kassa ofan á stóran í einum hópi og býr til `Box3` utan um allan staflann.
- `stallur` er fyrir skannaða hlutinn. `hlutHaldari` er tómur hópur efst á stallinum sem hluturinn fer í.

### LOFTLJÓS
`buaTilLampa()` býr til `SpotLight` sem vísar beint niður. `ljos.target` er líka sett í hópinn og fært 6 m niður, því SpotLight lýsir alltaf í átt að `target`. Gegnsæ keila með `AdditiveBlending` líkir eftir ljósgeisla í þokunni.

### HURÐ
Tveir helmingar í `hurd` hópnum. Hurðin er 0,2 m **fyrir aftan** vegginn, svo þegar helmingarnir renna til hliðar hverfa þeir á bak við veggbútana.

### ANAKIN OG GEISLASVERÐIÐ
- `anakin` er tómur `Group`. Módelið og sverðið eru sett inn í hann. Það er `anakin` sem er fært og snúið, ekki módelið sjálft.
- Sverðið: skaft, blað (kjarni + bláum ljóma) og `PointLight`. Blaðið er í eigin hópi sem byrjar efst á skaftinu, svo `blad.scale.y` frá 0 í 1 lætur það vaxa upp úr skaftinu.
- `sverdLjos.shadow.camera.near = 1`: hlutir nær ljósinu en 1 m varpa ekki skugga. Annars varpar Anakin sjálfur risastórum skugga beint að myndavélinni.
- **Hreyfingarnar:** `gltf.animations` er listi af klippum. `finnaKlippu()` leitar að klippu sem heitir t.d. „walk“, „run“ eða „idle“ (hástafir skipta ekki máli). Hver klippa verður `AnimationAction` með `mixer.clipAction(klippa)`. Ef engin Idle er til notum við fyrsta ramma göngunnar með `timeScale = 0`.
- `skiptaUmHreyfingu(ny)`: ef ný hreyfing er önnur en sú sem er í gangi er hún endurræst (`reset().play()`) og `virkHreyfing.crossFadeTo(ny, 0.3)` blandar mjúklega á 0,3 sek: gamla dofnar út, nýja kemur inn.

### DROID (VERAN Í HORNINU)
- `droid` er ytri hópurinn. Í lykkjunni er kallað á `droid.lookAt(x, 1.5, z)` á stöðu Anakins: hópurinn snýst svo **+z ásinn** hans vísi á Anakin. Þess vegna er augað sett á `z = 0.42`.
- `skrokkur` er innri hópur. **Hreyfiklippan er búin til í kóða:**
  - `VectorKeyframeTrack('skrokkur.position', tímar, gildi)`: á 0 sek er y = -0,15, á 1,5 sek er y = 0,15 og á 3 sek aftur -0,15.
  - `NumberKeyframeTrack('fotur0.rotation[x]', ...)`: fæturnir sveiflast fram og aftur, annar hver á móti.
  - Nafnið fyrir framan punktinn (`skrokkur`, `fotur0`) er `.name` hlutarins sem sporið á við.
  - `new THREE.AnimationClip('Svifa', 3, spor)` býr til 3 sek klippu og `droidMixer.clipAction(...).play()` spilar hana í lykkju.
- Af hverju tveir hópar? `lookAt` stjórnar snúningi ytri hópsins og klippan stjórnar stöðu innri hópsins, svo þau trufla ekki hvort annað.

### MINN EIGIN 3D HLUTUR
Hlaðið inn eins og Anakin, skalað í `MINN_HLUTUR_HAED` metra (raunveruleg hæð hlutarins) og sett í `hlutHaldari` á stallinum. Þar sem Anakin er 1,85 m og hluturinn er í sinni réttu hæð eru stærðarhlutföllin rétt.

### HLJÓÐ
- `AudioListener` er sett á myndavélina: það eru „eyrun“.
- `THREE.Audio` (umhverfishljóðið) heyrist jafnt alls staðar.
- `THREE.PositionalAudio` er 3D hljóð: það er sett sem barn hlutar (sverð, droid, hurð) og verður hærra því nær sem myndavélin er og kemur úr réttri átt (vinstri/hægri). `setRefDistance` segir hversu langt frá hljóðið heldur fullum styrk.
- `hladaHljodi()` notar `AudioLoader` (með manager) og stillir buffer, lykkju og styrk.
- Vafrar leyfa ekki hljóð fyrr en notandi hefur smellt, þess vegna er `listener.context.resume()` og `play()` í smelli á Byrja.

### ANIME.JS HREYFINGAR
`import 'animejs/adapters/three'` skráir Three.js adapterinn. Eftir það skilur `animate()` Three hluti beint:

| Eiginleiki í anime.js | Hvað breytist í Three.js |
| --- | --- |
| `x`, `y`, `z` | `position.x/y/z` |
| `rotateX`, `rotateY`, `rotateZ` (gráður) | `rotation.x/y/z` (radíanar) |
| `scale`, `scaleY` | `scale` |
| `opacity` | `material.opacity` |
| `intensity` | `light.intensity` |

Hreyfingarnar:
- **`flokta(lampi)`**: velur af handahófi hvort ljósið blikkar (fer næstum í 0 og aftur upp) eða breytir aðeins birtunni. Í `onComplete` kallar fallið á sjálft sig, svo flöktið er alltaf óreglulegt. `onUpdate` lætur peruna og ljósgeislann fylgja birtunni.
- **Augað** í droidnum: `loop: true, alternate: true` lætur `intensity` fara 2 → 8 → 2 endalaust.
- **Skannaði hluturinn**: `rotateY: 360` á 14 sek með `ease: 'linear'` í lykkju.
- **`kveikjaASverdi()`**: `scaleY` blaðsins 0 ↔ 1 og `intensity` ljóssins 0 ↔ 8.
- **`sveifla()`**: fylki með fleiri en tveimur gildum eru *keyframes*: `rotateX: [35, -40, 120, 35]` lyftir sverðinu, heggur og fer aftur í hvíldarstöðu.
- **`athugaHurd()`**: ef Anakin er nær hurðinni en 4,5 m renna helmingarnir í `x = ±2.25` og ljósið í ganginum kviknar. `hurdOpin` passar að þetta gerist bara einu sinni í hvert skipti.
- **`synaMerki()`**: hringur á gólfinu stækkar og dofnar þar sem smellt var.

### STÝRING
- `takkar` er `Set` af tökkum sem er haldið niðri. `keydown` bætir við, `keyup` tekur út. Þannig virka t.d. W + A saman (á ská).
- `pointerdown` virkar bæði fyrir mús og snertiskjá. Músarstaðan er umreiknuð í -1…1 (`benditill`), `raycaster.setFromCamera()` sendir geisla frá myndavélinni og `intersectObject(golf)` finnur hvar hann hittir gólfið. Sá punktur verður `markmid`.
- **`hreyfaAnakin(delta)`** í fjórum skrefum:
  1. Finna stefnu (`att`) út frá tökkum eða út frá `markmid`.
  2. Snúa Anakin mjúklega: `Math.atan2(att.x, att.z)` gefur hornið sem hann á að snúa í. `munur` er stysta leiðin þangað (svo hann snúi ekki 350° í stað 10°).
  3. Færa hann **einn ás í einu**: fyrst x, athuga árekstur, svo z. Ef hann rekst á súlu á ská rennur hann meðfram henni í stað þess að stoppa alveg.
  4. `Math.max(-MORK, Math.min(MORK, x))` heldur honum innan veggjanna.

  Hraðinn er margfaldaður með `delta` (sek síðan síðasti rammi) svo hann gangi jafn hratt á 30 og 144 fps.

### LYKKJAN
`renderer.setAnimationLoop()` keyrir í hverjum ramma:
1. `timer.update(timi)` og `timer.getDelta()`: tíminn síðan síðasti rammi. `Math.min(..., 0.1)` kemur í veg fyrir stórt stökk ef flipinn var í bakgrunni.
2. Anakin hreyfður og athugað hvort hurðin eigi að opnast.
3. `mixer.update(delta)` og `droidMixer.update(delta)` spila hreyfiklippurnar áfram.
4. `droid.lookAt(...)` snýr droidnum að Anakin.
5. `myndavelarRig.position.lerp(mark, 1 - Math.exp(-4 * delta))` færir myndavélina mjúklega á eftir Anakin. Markið er takmarkað við ±6,5 m svo myndavélin sjái ekki út fyrir herbergið þegar Anakin er við vegg.
6. `renderer.render(scene, camera)`.

---

## 4. Ef Anakin módelið lítur skringilega út

| Vandamál | Lausn |
| --- | --- |
| Gengur afturábak | `ANAKIN_SNUNINGUR = Math.PI` |
| Of stór / lítill | `ANAKIN_HAED` (hann er alltaf skalaður í þessa hæð) |
| Hreyfist ekki | Skoðaðu `Hreyfingar í anakin.glb: [...]` í Console. Ef klippurnar heita eitthvað annað, bættu nafninu við í `finnaKlippu(...)` |
| Sverðið er ekki í hendinni | Breyttu `geislasverd.position.set(-0.3, 1.0, 0.3)` |
| Er svartur | Sum módel eru mjög „málmkennd“. Prófaðu `hlutur.material.metalness = 0` inni í `model.traverse` |
| Rennur áfram og hoppar svo til baka | Göngu-hreyfingin er með „root motion“. Sæktu útgáfu „in place“ (t.d. á Mixamo er hakað í *In Place*) |
