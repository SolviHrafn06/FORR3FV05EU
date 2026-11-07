# Trépúsl – útskýringar á öllum kóðanum

Þetta skjal er til að **læra** hvað allt gerir svo þú getir útskýrt það munnlega fyrir kennaranum.
Lestu það með `index.html`, `css/style.css` og `js/main.js` opin hlið við hlið.

---

## 0. Hvernig leikurinn virkar (fyrir barnið)

1. Í byrjun **teiknast útlínur mótanna** upp, götin birtast og bitarnir skoppa inn.
2. **Hönd** birtist, heldur inni á einum bita, dregur hann að réttu móti og hverfur. Hún sýnir barninu hvað á að gera.
   Ef ekkert er snert í 10 sekúndur (og enginn biti er kominn) kemur höndin aftur.
3. Barnið **heldur fingri á bita** (0,4 sek). Hvítur hringur teiknast utan um fingurinn á meðan.
   Þegar hringurinn er búinn lyftist bitinn og þá má **draga** hann (pan).
4. Hjartað og þríhyrningurinn eru á hvolfi. Meðan barnið heldur á þeim með einum fingri setur það **annan fingur** á skjáinn og **snýr honum í hring** utan um bitann, eins og þegar mynd er snúið í síma. Bitinn snýst með fingrunum og smellur í næstu 90° þegar fingri er lyft (multi-touch).
5. Ef bitanum er sleppt nálægt réttu móti og hann snýr rétt **smellur hann á sinn stað**: stjörnur skjótast út og sólin brosir breitt (morphing).
   Annars vaggar hann, flýgur heim og sólin verður hissa.
6. Þegar allir bitar eru komnir: skýið **breytist í hjarta** (morphing), **býfluga flýgur eftir ferli** (motion path) og ör birtist.
7. Barnið **strýkur til vinstri** (swipe) til að byrja upp á nýtt.
8. Hvenær sem er má **halda á sólinni í 2 sekúndur** (long press) til að byrja upp á nýtt. Hringur teiknast utan um sólina og hún hristist á meðan.
9. Í hvert skipti sem fingri er lyft breiðist **gulur hringur** út frá fingrinum.

---

## 1. Hvar er hver krafa uppfyllt?

| Krafa | Hvar | Fall / element |
| --- | --- | --- |
| Allt í SVG, engin `<canvas>` | `index.html` | eitt `<svg id="leikur">` |
| Síma- og spjaldtölvuvænt | `style.css`, `radaUpp()` | `100dvh`, `touch-action: none`, viewBox skipt eftir stefnu skjás |
| **Animation** (anime.js) | `main.js` | `animate()` t.d. í `lyfta`, `smella`, `vagga`, `klaraSnuning`, `stjornur` |
| **Timeline** | `main.js` | `createTimeline()` í `byrjun`, `fljugaHeim`, `solin`, `synaKennslu`, `sigur`, `nyUmferd` |
| **Line drawing** | `main.js` | `svg.createDrawable` + `draw`: útlínur mótanna, hringur um fingur, hringur um sólina, hringur í kennsluhendinni |
| **Morphing** | `main.js` | `svg.morphTo`: munnur sólarinnar (bros/hissa/stórbros), skýið verður hjarta |
| **Motion path** | `main.js` | `svg.createMotionPath('#leid')`: býflugan í `sigur()` |
| Kvikun þegar fingur snertir / er haldið / er lyft | `main.js` | `haldHringur`, `fjarlaegjaHring`, `lyfta`, `sleppHringur` |
| Kvikun sem kennir hvernig á að spila | `main.js` | `synaKennslu()` (höndin) og útlínurnar sem teiknast í byrjun |
| **Multi-touch** | `pointerdown`, `pointermove` | `fingur[e.pointerId]`. Tveggja fingra snúningur (`byrjaSnuning`, `uppfaeraSnuning`, `klaraSnuning`). Líka hægt að draga tvo bita í einu |
| **Time-based gesture** | `pointerdown` | long press 0,4 sek á bita (`HALDA_MS`) og **2 sek á sól** (`HALDA_SOL_MS`) |
| **Pan** | `pointermove` | biti eltir fingur, smellur á sinn stað í `sleppa()` |
| **Swipe** | `fingriLyft()` | strjúka til hliðar eftir sigur → `nyUmferd()` |
| Engin Touch Events | allt | aðeins `pointerdown`, `pointermove`, `pointerup`, `pointercancel` |
| anime.js v4.5 | `lib/anime.esm.min.js` | efst í skránni stendur `@version v4.5.0` |

---

## 2. Skrárnar

```
Verkefni 2/
├── index.html            ← allt SVG-ið (borð, mót, bitar, sól, ský, býfluga, hönd, ör)
├── css/style.css         ← litir og útlit (engar hreyfingar)
├── js/main.js            ← öll virkni: anime.js + Pointer Events
├── lib/anime.esm.min.js  ← anime.js v4.5.0 (sótt, ekki breytt)
└── img/icon.svg          ← táknmynd í vafraflipanum
```

`<script type="module">` er notað því anime.js er **ES-module**: við sækjum föll úr því með `import`.
Þess vegna þarf að opna síðuna í gegnum vefþjón (t.d. Live Server í VS Code), ekki með því að tvísmella á skrána.

---

## 3. SVG og umgjörð (`index.html` + `style.css`)

### viewBox
`<svg id="leikur" viewBox="0 0 700 1000">` býr til **hnitakerfi**: 700 einingar á breidd og 1000 á hæð, (0,0) efst til vinstri.
Sama hvað skjárinn er stór eru hnitin alltaf þau sömu og SVG-ið skalast sjálft.
`preserveAspectRatio="xMidYMid meet"` = allt sést og er miðjað.

`radaUpp()` í main.js skiptir um viewBox:
- **uppréttur skjár (sími)**: `0 0 700 1000` → bitarnir eru **undir** borðinu (`data-x`, `data-y`)
- **skjár á hlið (spjaldtölva)**: `0 0 1240 700` → bitarnir eru **við hliðina** á borðinu (`data-lx`, `data-ly`)

Borðið er á sama stað í báðum, bara bitarnir færast. `radaUpp` keyrir líka á `resize` þegar símanum er snúið.

### `<defs>` og `<use>`
Allt í `<defs>` er **ekki teiknað**, það er geymt til að endurnota.
`<use href="#form-hringur">` teiknar afrit af forminu. Þannig er hvert form skrifað bara einu sinni
og notað bæði í gatið (`.gat`), í bitann og í glansinn ofan á bitanum.

Formin eru teiknuð í kringum **(0,0)**. Þá snýst og stækkar bitinn um sína eigin miðju
og við getum fært hann með `translateX/translateY`.

### Gradients
`linearGradient` = litur sem breytist. Notað í CSS með `fill: url(#himinn)`.
`#glans` er hvítt efst og dökkt neðst og er sett **ofan á** bitana og borðið svo þau líti út fyrir að vera þrívíð.

### clipPath
`#bord-klipp` sker viðaræðarnar af svo þær fari ekki út fyrir borðið.

### Uppbygging bita
```html
<g class="bit snyst" data-mot="mot-hjarta" data-snuningur="270" data-x=".." data-y=".." data-lx=".." data-ly="..">
  <circle class="snertiflotur" r="82"/>   ← ósýnilegur, stærri flötur svo auðvelt sé að hitta með fingri
  <use class="hjarta" href="#form-hjarta"/>
  <use class="glans"  href="#form-hjarta"/>
  <use href="#andlit"/>
</g>
```
- `data-*` eigindi eru lesin í JavaScript með `bit.dataset.mot`, `bit.dataset.snuningur` o.s.frv.
- `class="snyst"` = þennan bita þarf að snúa.

### Mótin
Hvert mót er `<g class="mot">` með `.utlina` (ljós rönd) og `.gat` (dökkt gat).
`.utlina` er **alvöru** `<circle>`/`<rect>`/`<path>` en ekki `<use>`, því `createDrawable` (line drawing) þarf að mæla lengd línunnar og það virkar ekki á `<use>`.

### Faldir hlutir fyrir morphing
`<g visibility="hidden">` geymir formin `#bros`, `#hissa`, `#storbros`, `#sky-venjulegt` og `#sky-hjarta`.
Þau sjást ekki, en `svg.morphTo('#hissa')` les lögun þeirra.

### Nýju hlutirnir
- `#tima-hringur`: hringur utan um sólina sem teiknast upp á 2 sekúndum þegar haldið er á henni.
- `#hond`: kennsluhöndin. Í henni er `#draugur` (hálfgegnsætt afrit af formi), `#hond-hringur` (hringur sem teiknast þegar höndin „heldur inni“) og `#hond-innri` (sjálf höndin). Fingurgómurinn er í (0,0) svo þegar höndin er færð á hnit bitans bendir hún beint á hann.

### CSS sem skiptir máli fyrir síma
```css
#leikur {
  width: 100vw;
  height: 100dvh;        /* dvh = rétt hæð á síma þó vafrastikan birtist/hverfi */
  touch-action: none;    /* vafrinn má ekki skruna/þysja með fingrinum */
  user-select: none;     /* enginn texti valinn við langt þrýsting */
  -webkit-touch-callout: none; /* engin valmynd á iPhone við langt þrýsting */
}
```
**`touch-action: none` er mjög mikilvægt.** Án þess tekur vafrinn yfir fingurinn til að skruna
og sendir `pointercancel` í miðjum drætti.

`pointer-events: none` á `#ahrif`, `#byfluga`, `#or`, `#hond`, `#tima-hringur` og öllum `use`:
þessir hlutir taka ekki við snertingu, svo snerting „fer í gegnum“ þá. Þess vegna er `e.target` í bita alltaf `.snertiflotur` og `closest('.bit')` finnur bitann.

`.bit.lyftur` gefur stærri skugga (bitinn „svífur“) og `.bit.kominn` tekur skuggann af (bitinn „sökk“ ofan í gatið).

Viewport-metatagið `user-scalable=no` kemur í veg fyrir að vafrinn þysji þegar tveir fingur eru á skjánum.

---

## 4. anime.js v4.5

Efst í main.js:
```js
import { animate, createTimeline, stagger, svg, utils } from '../lib/anime.esm.min.js';
```

| Fall | Hvað það gerir |
| --- | --- |
| `animate(hlutur, { ... })` | ein hreyfing (Animation) |
| `createTimeline()` | röð af hreyfingum sem raðast í tíma (Timeline) |
| `stagger(150)` | hver hlutur í lista byrjar 150 ms á eftir þeim á undan |
| `svg.createDrawable(...)` | gerir línu „teiknanlega“ (line drawing) |
| `svg.morphTo('#id')` | breytir lögun `path` í lögun annars `path` (morphing) |
| `svg.createMotionPath('#leid')` | lætur hlut fylgja ferli (motion path) |
| `utils.set(hlutur, {...})` | setur gildi **strax**, án hreyfingar |
| `utils.get(hlutur, 'translateX', false)` | les núverandi gildi sem tölu (`false` = án einingar) |
| `utils.remove(hlutur)` | stöðvar allar hreyfingar sem eru í gangi á hlutnum |

### Gildi í animate
```js
animate(bit, { scale: 1.15, duration: 250, ease: 'outBack(3)' });
```
- `scale: 1.15` → úr núverandi gildi í 1.15
- `scale: [0, 1]` → úr 0 í 1
- `rotate: [r, r-10, r+10, r]` → mörg gildi = keyframes (vagga fram og til baka)
- `duration` í millisekúndum
- `ease` = hvernig hraðinn breytist. `outBack` skýst aðeins framhjá og kemur til baka (skopp). `linear` = jafn hraði. `inOutQuad` = hægt–hratt–hægt.
- `loop: true` = endalaust, `alternate: true` = fram og til baka, `loopDelay` = bið milli umferða
- `onComplete: () => ...` = keyrir þegar hreyfingin er búin
- `translateX: (bit) => bit.heimaX` = **fall** sem gefur hverjum hlut sitt eigið gildi

### Timeline og staðsetning (þriðja færibreytan í `.add`)
```js
createTimeline()
  .add(A, {...})            // byrjar strax
  .add(B, {...}, '-=600')   // byrjar 600 ms ÁÐUR en A klárast
  .add(C, {...}, 0)         // byrjar á tíma 0 (samtímis A)
  .add(D, {...}, '+=1000')  // bíður 1 sek eftir síðustu hreyfingu
  .add(E, {...}, '<<')      // byrjar á sama tíma og hreyfingin á undan
  .call(() => {...})        // keyrir JavaScript-fall á þessum stað í tímalínunni
```
Án staðsetningar byrjar hver hreyfing þegar sú á undan er búin.

### Line drawing
```js
const utlinur = svg.createDrawable('.utlina');
animate(utlinur, { draw: ['0 0', '0 1'] });
```
`draw: 'byrjun endir'`, bæði frá 0 til 1. `'0 0'` = ekkert sést, `'0 1'` = öll línan sést.
Á bak við tjöldin notar anime.js `stroke-dasharray` / `stroke-dashoffset` (sama hugmynd og í Verkefni 1).

Notað á fjórum stöðum:
1. útlínur mótanna í byrjun og í nýrri umferð (sýnir hvert bitarnir eiga að fara)
2. hvítur hringur utan um fingurinn á meðan haldið er á bita (`haldHringur`)
3. hringur utan um sólina á 2 sek (`byrjaSolHald`)
4. hringurinn í kennsluhendinni (`synaKennslu`)

### Morphing
```js
.add('#munnur', { d: svg.morphTo('#hissa'), duration: 300 })
```
`d` er eigindi `path` sem lýsir lögun hans. anime.js reiknar millistig milli tveggja forma.
Munnurinn verður hissa (rangt), stórt bros (rétt) og skýið verður að bleiku hjarta í sigri.

### Motion path
```js
const leid = svg.createMotionPath('#leid');
.add('#byfluga', { ...leid, duration: 3000, ease: 'inOutSine' }, 300)
```
`createMotionPath` skilar hlut með `translateX`, `translateY` og `rotate` sem fylgja ferlinum `#leid`.
`...leid` (spread) setur þessi þrjú gildi inn í hreyfinguna. Býflugan snýr líka í þá átt sem hún flýgur.

---

## 5. main.js – fall fyrir fall

### Breytur efst
- `leikur`, `ahrif`, `bitar`, `mot` = element úr DOM-inu.
- `utlinur`, `timaHringur`, `hondHringur` = teiknanlegar línur.
- `HALDA_MS = 400` = long press á bita. `HALDA_SOL_MS = 2000` = long press á sól.
- `buid` = `true` þegar allir bitar eru komnir (þá má swipe-a).
- `sigurBid`, `sigurTl`, `kennsla`, `kennsluBid` = geyma tímastilla og tímalínur svo hægt sé að stöðva þau.
- `utils.set(timaHringur, { draw: '0 0' })` = hringirnir eru ósýnilegir í byrjun.

### Undirbúningur
- `mot.forEach(...)`: færir hvert mót á `data-x`, `data-y`.
- `bitar.forEach(...)`: hver biti fær **eigin breytur** beint á DOM-hlutinn: `bit.snuningur` (gráður), `bit.mot` (mótið hans), `bit.kominn`. `Number()` breytir texta í tölu.

### `radaUpp()`
Athugar hvort skjárinn er breiðari en hár, velur viewBox og heimastað bitanna og færir lausa bita heim.

### Hreyfingar
- `lyfta(bit)`: bitinn stækkar í 1.15 og fær klasann `lyftur` (stærri skuggi).
- `smella(bit)`: bitinn rennur í mótið og þrýstist niður og upp (`scale: [1.15, 0.9, 1]`).
- `fljugaHeim(bit)`: **timeline**: fyrst vaggar hann („nei“), svo flýgur hann heim og stækkar á leiðinni (lítur út eins og hopp).
- `vagga(bit)`: vaggar til hliðanna. Notað þegar bankað er stutt á bita eða þegar reynt er að snúa hring/ferningi (þeir þurfa ekki að snúast).
### Tveggja fingra snúningur
Fingur 1 dregur bitann. Fingur 2 snýr honum. Við horfum á **línuna milli fingranna tveggja**: þegar hún snýst, snýst bitinn jafn mikið.

- `horn(a, b)`: hornið á línunni frá fingri a að fingri b, í gráðum. `Math.atan2(dy, dx)` gefur hornið í radíönum og `* 180 / Math.PI` breytir í gráður.
- `byrjaSnuning(s, dragari)`: kallað þegar fingur 2 snertir skjáinn. Tengir fingurna saman (`s.snyr = dragari` og `dragari.snuningsfingur = s`), vistar byrjunarhornið (`s.sidastaHorn`) og hve mikið bitinn var snúinn (`s.byrjunSnuningur`).
- `uppfaeraSnuning(s)`: kallað í **hvert sinn sem annar hvor fingurinn hreyfist**. Reiknar nýja hornið, dregur gamla hornið frá og leggur breytinguna við `s.samtals`. Svo `utils.set(bit, { rotate: byrjunSnuningur + samtals })` svo bitinn fylgi fingrunum strax.
  - Af hverju `if (breyting > 180) breyting -= 360`? `atan2` gefur gildi frá -180 til 180. Þegar línan fer framhjá 180° hoppar talan t.d. úr 179 í -179. Það lítur út eins og -358° breyting en er í raun bara +2°. Þessar línur laga það.
  - Breytingin er lögð saman í smáum skrefum svo hægt sé að snúa oftar en hálfan hring.
- `klaraSnuning(s)`: kallað þegar öðrum hvorum fingrinum er lyft. `Math.round(r / 90) * 90` = næstu 90 gráður (t.d. 350° → 360°, 10° → 0°). Bitinn snýst þangað með `animate` og `outBack` (smá skopp) og fingurnir eru aftengdir.

Hjartað byrjar í 270°. Snúið um ~90° réttsælis verður það 360°, og `360 % 360 === 0` = snýr rétt. Það má líka snúa rangsælis í 0°.

Hringur og ferningur passa hvernig sem þeir snúa, svo þeir vagga bara (`vagga`) ef reynt er að snúa þeim.
- `solin(svipur)`: **timeline + morphing**: munnurinn breytist, sólin hoppar á sama tíma (`0`), og eftir 1 sek fer munnurinn aftur í bros.
- `stjornur(x, y)`: býr til 8 stjörnur. `i * Math.PI / 4` = 45° á milli (8 × 45° = hringur). `cos` og `sin` reikna hvert hver stjarna fer. Stjarnan er fjarlægð í `onComplete`.
- `nyrHringur(...)`: býr til `<circle>` í `#ahrif`. **SVG-element þarf að búa til með `createElementNS`** og SVG-nafnrýminu, ekki `createElement`.
- `haldHringur(x, y)`: hringur sem teiknast utan um fingurinn á nákvæmlega `HALDA_MS`. Þegar hann er fullur má draga. Þetta **sýnir barninu að það eigi að halda inni**.
- `fjarlaegjaHring(hringur)`: stöðvar teikninguna og lætur hringinn stækka og hverfa.
- `sleppHringur(x, y)`: gulur hringur sem breiðist út þegar fingri er lyft.

### Kennsluhöndin
- `synaKennslu()`: finnur fyrsta bita sem er ekki kominn og þarf ekki að snúa. Draugurinn fær sama form og lit (`setAttribute('href', ...)`). Svo **timeline**:
  1. höndin kemur inn og fer á bitann
  2. hún þrýstir niður (`scale: 0.85`) og hringur teiknast utan um fingurinn (line drawing, `'<<'` = samtímis)
  3. draugurinn birtist og „lyftist“
  4. höndin dregur drauginn að mótinu
  5. sleppir og hverfur
- `stoppaKennslu()`: kallað um leið og barnið snertir skjáinn. Stöðvar tímalínuna og felur höndina.
- `bidaEftirKennslu()`: setur 10 sek tímastilli. Ef enginn biti er kominn þá er höndin sýnd aftur. Tímastillirinn er endurstilltur við hverja snertingu.

### Leikurinn
- `byrjun()`: **timeline**: útlínur teiknast (line drawing með `stagger`), götin birtast 600 ms áður en útlínurnar klárast, bitarnir skoppa inn, og svo (`.call`) sýnir höndin hvað á að gera.
- `sleppa(bit)`: kallað þegar fingri er lyft af bita sem var dreginn.
  - `Math.hypot(dx, dy)` = fjarlægð (Pýþagóras) frá bitanum að mótinu.
  - Rétt ef fjarlægð < 90 **og** `snuningur % 360 === 0`.
  - Rétt: `kominn = true`, `prepend` setur bitann fremst í `#bitar` svo hann teiknist **undir** lausum bitum, smella, stórbros, stjörnur. Ef allir eru komnir byrjar `sigur` eftir 600 ms.
  - Rangt: `fljugaHeim` og sólin verður hissa.
- `sigur()`: **timeline**: stórbros og skýið verður hjarta (morphing), bitarnir hoppa einn í einu, stjörnur, býflugan birtist og flýgur eftir `#leid` (motion path), örin birtist og togar endalaust til vinstri (= „strjúktu!“).
- `nyUmferd()`: stöðvar sigur ef hann er enn í gangi, núllstillir bitana, felur örina, munnurinn og skýið fara til baka (morphing), bitarnir fljúga heim og útlínurnar teiknast aftur.
- `byrjaSolHald(f)`: hringurinn um sólina teiknast á 2 sek og sólin hristist (`loop` + `alternate`). `setTimeout` bíður í 2 sek og byrjar þá nýja umferð (nema einhver sé að draga bita).
- `haettaSolHaldi(f)`: stöðvar tímastillinn og hreyfingarnar og lætur hringinn hverfa aftur.

---

## 6. Pointer Events (snerting)

### Af hverju Pointer Events en ekki Touch Events?
Pointer Events virka eins fyrir **fingur, mús og penna**. Hver snerting er sérstakur „pointer“ með sitt eigið `pointerId`.
Touch Events eru bannaðir í verkefninu og þeir eru hvergi notaðir.

| Atburður | Hvenær |
| --- | --- |
| `pointerdown` | fingur snertir skjáinn |
| `pointermove` | fingur hreyfist |
| `pointerup` | fingri lyft |
| `pointercancel` | vafrinn/stýrikerfið hættir við snertinguna (t.d. símtal). Meðhöndlað eins og `pointerup` |

### `fingur` – hjartað í multi-touch
```js
const fingur = {};
fingur[e.pointerId] = { startX, startY, startTimi, ... };
```
Hver fingur á skjánum fær sinn eigin hlut, geymdan undir `pointerId`. Þannig vitum við fyrir **hvern fingur fyrir sig**:
hvar hann byrjaði, hvenær, hvaða bita hann heldur á (`f.bit`), hvort hann er að draga (`f.dregur`), hvort hann heldur á sólinni (`f.sol`), og tímastillinn hans (`f.timi`).
Þegar fingri er lyft er hann tekinn út með `delete fingur[e.pointerId]`.

### `svgPunktur(e)`
`e.clientX/clientY` eru **pixlar á skjánum**, en bitarnir nota **SVG-hnit** (viewBox).
`leikur.getScreenCTM()` er umbreytingin úr SVG-hnitum í skjápixla. `.inverse()` snýr henni við: pixlar → SVG-hnit.
Þannig virkar draggið rétt sama hvað skjárinn er stór.

### `setPointerCapture(e.pointerId)`
Segir vafranum að senda alla næstu atburði þessa fingurs til `#leikur`, líka þótt fingurinn fari út fyrir SVG-ið.

### pointerdown – skref fyrir skref
1. Reikna SVG-hnit og finna bitann með `e.target.closest('.bit')` (`null` ef enginn biti).
2. Vista nýjan fingur í `fingur`. Stöðva kennsluhöndina.
3. **Multi-touch:** `Object.values(fingur).find(annar => annar.dregur && annar !== f)` = er annar fingur að draga bita?
   Ef já og nýi fingurinn snerti autt svæði (eða sama bitann) → `byrjaSnuning(f, dragari)` (eða `vagga` fyrir hring/ferning). Svo `return`.
   Ef það er þegar verið að snúa bitanum (`dragari.snuningsfingur`) er þriðja fingrinum sleppt.
   Ef nýi fingurinn snerti **annan** bita heldur kóðinn áfram, svo það má draga tvo bita samtímis með tveimur fingrum.
4. **Sól (2 sek long press):** ef snert var á sólina → `byrjaSolHald(f)`.
5. **Biti (long press 0,4 sek):** `haldHringur` byrjar og `setTimeout` bíður í `HALDA_MS`. Þegar tíminn er liðinn:
   - hringurinn hverfur, `f.dregur = true`
   - `utils.remove(bit)` stöðvar hreyfingar sem eru í gangi (t.d. ef bitinn var á leiðinni heim)
   - `f.bilX/bilY` = bilið frá fingrinum að miðju bitans, svo bitinn hoppi ekki undir fingurinn
   - `appendChild` setur bitann aftast í `#bitar` = teiknaður **ofan á** hina
   - `lyfta(bit)`

### pointermove
- Fyrst er staðsetning fingursins vistuð í `f.x`, `f.y`. `horn()` þarf að vita hvar báðir fingurnir eru.
- Ef fingurinn er að draga → `utils.set(f.bit, { translateX: p.x + f.bilX, ... })` = **pan**. `utils.set` er notað (ekki `animate`) því bitinn á að fylgja fingrinum strax. Ef annar fingur er að snúa er snúningurinn líka uppfærður, því línan milli fingranna breytist.
- Ef fingurinn er snúningsfingur (`f.snyr`) → `uppfaeraSnuning(f)`.
- Ef haldið er á sólinni og fingurinn fer meira en 40 einingar → hætt við.
- Ef haldið er á bita og fingurinn fer meira en 25 einingar **áður en tíminn er liðinn** → hætt við long press og bitinn vaggar (barnið þarf að halda kyrru fyrst).

### fingriLyft (pointerup / pointercancel)
1. Taka fingurinn út úr `fingur` og sýna gula `sleppHringur`.
2. Var hann að draga? → ef verið var að snúa er `klaraSnuning` kallað fyrst, svo `sleppa(f.bit)` (rétt/rangt).
   Var hann snúningsfingur? → `klaraSnuning(f)`. Bitinn smellur í næstu 90° og fyrsti fingurinn heldur áfram að draga.
3. Hélt hann á sólinni? → hætta við (fingri lyft fyrir 2 sek).
4. Var long press ekki búinn? → hætta við og vagga.
5. Annars, ef leikurinn er búinn → athuga **swipe**:
   ```js
   Math.abs(dx) > 120 && Math.abs(dx) > Math.abs(dy) && timi < 800
   ```
   = langt til hliðar, meira lárétt en lóðrétt, og hratt (undir 0,8 sek). Þá → `nyUmferd()`.

`contextmenu` er stöðvað svo valmynd birtist ekki við langt þrýsting.

### Munurinn á swipe og pan
- **Pan**: hluturinn fylgir fingrinum allan tímann (draga bita).
- **Swipe**: aðeins byrjun og endir skipta máli, stutt og hröð stroka (byrja upp á nýtt).

---

## 7. Endalausar bakgrunnshreyfingar (neðst í main.js)
```js
animate('#geislar', { rotate: 360, duration: 20000, loop: true, ease: 'linear' }); // geislar sólar snúast
animate('#augu', { scaleY: [1, 0.1, 1], duration: 300, loop: true, loopDelay: 3000 }); // sólin blikkar
animate('#sky-form', { translateX: [-30, 30], ..., alternate: true });               // skýið svífur
animate('.vaengur', { scaleY: [1, 0.4], duration: 80, loop: true, alternate: true });  // vængir býflugunnar
```
`#augu` hefur `transform-box: fill-box; transform-origin: center` í CSS svo augun minnki um sína eigin miðju.

---

## 8. Hverju var breytt / lagað núna

1. **Kennsluhönd bætt við** (`synaKennslu`, `stoppaKennslu`, `bidaEftirKennslu`, `#hond` í HTML). Verkefnið biður um kvikun sem kennir barninu hvernig á að spila.
2. **Long press í 2 sek á sólina til að byrja upp á nýtt** (`byrjaSolHald`, `haettaSolHaldi`, `#tima-hringur`). Tímatengd snerting eins og í dæminu í verklýsingunni, með line drawing sem sýnir hvað tíminn er langt kominn.
3. **Villa löguð í `vagga()`**: hún setti `scale: 1`. Þegar reynt var að snúa hring/ferningi með öðrum fingri missti bitinn „lyftinguna“ á meðan hann var dreginn. Nú breytir `vagga` bara `rotate`.
4. **Snúningur með tveimur fingrum eins og í síma**: áður snerist bitinn um 90° þegar pikkað var með öðrum fingri. Nú snýst hann með fingrunum (`horn`, `byrjaSnuning`, `uppfaeraSnuning`, `klaraSnuning`).
5. **`nyUmferd()` gerð örugg hvenær sem er**: stöðvar sigur-tímalínuna og `setTimeout`, felur býfluguna og setur `scale: 1` á bitana. Það þurfti því nú má byrja upp á nýtt í miðjum leik (sólin).

---

## 9. Spurningar sem kennarinn gæti spurt

**Af hverju ekki `<canvas>`?** Í SVG er hvert form sérstakt DOM-element. Það má velja það með `querySelector`, gefa því klasa, hlusta á atburði og kvika það með anime.js. Canvas er bara pixlar.

**Hvernig veistu hvaða biti var snertur?** `e.target.closest('.bit')`. `e.target` er `.snertiflotur` og `closest` fer upp DOM-tréð þar til það finnur `.bit`.

**Hvernig virkar multi-touch hjá þér?** Hver fingur hefur `pointerId`. Ég geymi hvern fingur í hlutnum `fingur`. Þegar nýr fingur kemur athuga ég hvort annar fingur er nú þegar að draga bita. Ef svo er tengi ég fingurna saman. Í hvert sinn sem annar þeirra hreyfist reikna ég hornið á línunni milli þeirra með `Math.atan2` og sný bitanum jafn mikið og línan snerist. Þegar fingri er lyft smellur bitinn í næstu 90°.

**Hvað er time-based gesture hjá þér?** Tvennt: (1) halda á bita í 400 ms áður en hann lyftist, gert með `setTimeout` sem er hætt við (`clearTimeout`) ef fingri er lyft eða hann hreyfður of snemma. (2) Halda á sólinni í 2 sek til að byrja upp á nýtt.

**Muninn á `animate` og `utils.set`?** `animate` hreyfir yfir tíma. `utils.set` setur gildið strax. Í pan notum við `utils.set` því bitinn á að vera nákvæmlega undir fingrinum.

**Muninn á `animate` og `createTimeline`?** `animate` er ein hreyfing. Timeline raðar mörgum hreyfingum í tíma, í röð eða samtímis, og hægt er að stöðva þær allar í einu (`.pause()`).

**Hvað gerir `stagger`?** Gefur hverjum hlut í lista mismunandi `delay` svo þeir byrji hver á eftir öðrum.

**Af hverju `touch-action: none`?** Annars notar vafrinn fingurinn til að skruna eða þysja og sendir `pointercancel`. Þá myndi draggið slitna.

**Af hverju `getScreenCTM().inverse()`?** Til að breyta skjápixlum í viewBox-hnit, því SVG-ið er skalað.

**Hvernig veistu að bitinn snýr rétt?** `bit.snuningur % 360 === 0`. `%` er afgangur af deilingu, svo 0, 360, 720… gefa allt 0.

**Hvernig var reiknað hvort biti væri nógu nálægt?** `Math.hypot(x - motX, y - motY) < 90`, þ.e. fjarlægðin milli tveggja punkta (Pýþagóras: √(dx² + dy²)).

---

## 10. Hvernig á að prófa

1. Opna möppuna `Verkefni 2` í VS Code og keyra **Live Server** (eða `python3 -m http.server` í möppunni og opna `http://localhost:8000`).
2. Í Chrome/Edge: F12 → tækjatáknið (Device toolbar) → velja síma eða spjaldtölvu. Þá líkir vafrinn eftir snertingu.
3. Til að prófa multi-touch er best að nota alvöru síma/spjaldtölvu á sama neti (Live Server sýnir IP-tölu), eða hýsa á GitHub Pages.
