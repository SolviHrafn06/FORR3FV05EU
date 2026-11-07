# Trépúsl 🧩

Einfalt trépúsl fyrir **2–3 ára börn** á spjaldtölvu eða síma. Barnið dregur form
(hring, ferning, þríhyrning og hjarta) í rétt mót á viðarborði. Í leiknum er enginn texti, aðeins myndir og hreyfingar.

**Spila:** _(slóð á GitHub Pages)_

## Hvernig er spilað?
1. **Haltu fingri á bita.** Hvítur hringur teiknast í kringum fingurinn. Þegar hann er heill má draga bitann.
2. **Dragðu bitann í rétt mót.** Ef það er rétt smellur hann á sinn stað og sólin skellihlær. Ef það er rangt flýgur hann aftur heim og sólin verður hissa.
3. **Hjartað og þríhyrningurinn snúa vitlaust.** Haltu á bitanum og **snertu skjáinn með öðrum fingri**. Þá snýst bitinn um 90°.
4. Þegar allt er komið flýgur býfluga yfir skjáinn og ör birtist. **Strjúktu til hliðar** til að byrja aftur.

## Skrár
```
index.html          Allt SVG-ið (borð, mót, bitar, sól, býfluga, ör)
css/style.css       Allt útlit: litir, skuggar, staðsetning sólar og skýs
js/main.js          Hreyfingar (anime.js) og snerting (Pointer Events)
lib/anime.esm.min.js  anime.js v4.5
```

## Keyrsla
Opnaðu með **Live Server** í VS Code. Tvísmellur á `index.html` virkar ekki, því `import` krefst vefþjóns.
Á netinu: GitHub → Settings → Pages → Branch: `main` → Save.

---

## Útlit – hvernig er þetta gert flott?
Næstum allt útlitið er **HTML og CSS**, ekki JavaScript:
- **Gradients** (`<linearGradient>` í `<defs>`): himinninn, ljós á borðinu og bitunum (`url(#glans)`), og dýpt í götunum.
- **Viðaræðar:** bylgjulínur (`<path>`) klipptar við borðið með `clip-path`.
- **Skuggi:** `filter: drop-shadow(...)` í CSS. Klasinn `.lyftur` gefur stærri skugga þegar bita er lyft og `.kominn` tekur skuggann af þegar bitinn er kominn í mót.
- **`<use>`:** hvert form er teiknað einu sinni í `<defs>` og endurnýtt, og sama gildir um andlitið og sólargeislana.
- **Uppréttur skjár eða á hlið:** CSS `@media (orientation: landscape)` færir sólina og skýið.

---

## anime.js – það sem þú þarft að kunna

### 1. `animate()` – ein hreyfing
```js
animate(bit, { scale: 1.15, duration: 250, ease: 'outBack(3)' });
```
| Hluti | Merking |
|---|---|
| `bit` | **hvað** á að hreyfa (element, eða CSS-veljari eins og `'#or'`) |
| `scale: 1.15` | fara úr núverandi stærð í 1.15 |
| `scale: [0, 1]` | fara úr 0 í 1 |
| `rotate: [0, 10, -10, 0]` | mörg skref í röð (vagg) |
| `translateX`, `translateY` | færa hlutinn |
| `opacity` | gegnsæi (0–1) |
| `duration: 250` | lengd í millisekúndum |
| `ease` | hvernig hraðinn breytist: `'linear'` (jafnt), `'outQuad'` (mjúkt), `'outBack(2)'` (skopp í lokin) |
| `loop: true` | endurtaka endalaust |
| `onComplete: () => {...}` | gera eitthvað þegar hreyfingin er búin |

### 2. `utils` – án hreyfingar
```js
utils.set(bit, { translateX: 200 });          // setja STRAX
utils.get(bit, 'translateX', false);          // lesa gildi (false = sem tölu)
utils.remove(bit);                            // stöðva hreyfingar á bitanum
```
Í drætti notum við `utils.set`, því bitinn á að vera **strax** undir fingrinum en ekki elta hann mjúklega.

### 3. `stagger()` – hver á eftir öðrum
```js
animate(bitar, { scale: [0, 1], delay: stagger(150) });
```
Fyrsti biti byrjar strax, annar eftir 150 ms, þriðji eftir 300 ms… Þeir skoppa inn **einn í einu**.

### 4. `createTimeline()` – margar hreyfingar í röð
```js
createTimeline()
  .add(A, { ... })            // A
  .add(B, { ... })            // B byrjar þegar A endar
  .add(C, { ... }, '-=600')   // C byrjar 600 ms áður en B endar
  .add(D, { ... }, 0)         // D byrjar strax í upphafi (samhliða A)
  .call(() => { ... });       // keyra venjulegt JS-fall
```
Notað í `byrjun()`, `sigur()`, `nyUmferd()`, `fljugaHeim()` og `solin()`.

### 5. Line drawing – lína teiknast upp
```js
const utlinur = svg.createDrawable('.utlina');
animate(utlinur, { draw: ['0 0', '0 1'], duration: 900 });
```
`draw: '0 0'` = ekkert sést, `draw: '0 1'` = öll línan sést. Notað fyrir **útlínur mótanna** í byrjun
(sýnir barninu hvert bitarnir eiga að fara) og **hringinn í kringum fingurinn** við long press.

### 6. Morphing – form breytist í annað form
```js
animate('#munnur', { d: svg.morphTo('#hissa'), duration: 300 });
```
Munnur sólarinnar breytist í lögun `<path id="hissa">`. Markmiðsformin eru falin í HTML (`visibility="hidden"`).

### 7. Motion path – fylgja ferli
```js
const leid = svg.createMotionPath('#leid');
animate('#byfluga', { ...leid, duration: 3000 });
```
`leid` inniheldur `translateX`, `translateY` og `rotate`, og `...leid` setur þau öll inn í einu.
Býflugan flýgur eftir `<path id="leid">` og snýr í flugáttina.

---

## Pointer Events – snerting

| Atburður | Hvenær |
|---|---|
| `pointerdown` | fingur snertir skjáinn |
| `pointermove` | fingur hreyfist |
| `pointerup` / `pointercancel` | fingri lyft |

Hver fingur hefur sitt eigið númer, `e.pointerId`. Við geymum fingurna í hlut: `fingur[e.pointerId] = { ... }`.
Þannig vitum við hvaða fingur gerir hvað, og það er grunnurinn að **multi-touch**.

| Bending | Hvernig |
|---|---|
| **Long press** (tímabundin) | `setTimeout(..., 400)` í `pointerdown`. Ef fingri er lyft eða hann hreyfður fyrr: `clearTimeout` |
| **Pan** | í `pointermove`: `utils.set(bit, { translateX: ..., translateY: ... })` |
| **Multi-touch** | ef einn fingur dregur bita og **annar fingur** snertir skjáinn snýst bitinn um 90°. Einnig er hægt að draga tvo bita í einu |
| **Swipe** | í `pointerup`: fór fingurinn meira en 120 til hliðar á innan við 0,8 sek? |

**Mikilvæg smáatriði:**
- `touch-action: none` (CSS) bannar vafranum að skruna eða þysja með fingrunum. Án þess slitnar dráttur.
- `setPointerCapture()` lætur fingurinn ekki „týnast“ þótt hann fari út fyrir bitann.
- `svgPunktur(e)` breytir pixlum fingursins í hnit SVG-sins (viewBox).

---

## Kröfurnar

| Krafa | Hvar |
|---|---|
| SVG | allt í `index.html`, ekkert canvas |
| Sími / spjaldtölva | Uppréttur skjár: bitarnir undir borðinu. Á hlið: bitarnir við hliðina (`radaUpp()` velur `viewBox` og `data-x`/`data-lx`, CSS media query færir sól og ský). `touch-action`, stór snertiflötur |
| Animation | `lyfta()`, `smella()`, `vagga()`, `snua()` … |
| Timeline | `byrjun()`, `sigur()`, `nyUmferd()`, `fljugaHeim()`, `solin()` |
| Line drawing | útlínur mótanna + hringur við long press |
| Morphing | munnur sólarinnar + skýið breytist í hjarta |
| Motion path | býflugan |
| Snerting sýnd með kvikun | hringur teiknast þegar haldið er inni, gulur hringur þegar fingri er lyft |
| Multi-touch | annar fingur snýr bitanum + hægt að draga tvo bita í einu |
| Time-based gesture | long press, 400 ms |
| Pan + Swipe | draga bita í mót + strjúka til að byrja aftur |

## Heimildir
- [anime.js v4](https://animejs.com/documentation/)
- [MDN: Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
