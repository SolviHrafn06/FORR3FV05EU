# Trépúsl 🧩

Einfalt gagnvirkt trépúsl fyrir **2–3 ára börn**, hannað fyrir spjaldtölvur og síma.
Leikurinn líkir eftir gömlu góðu viðarpúsli: á viðarborði eru mót (göt) og barnið dregur
púslbitana í rétt mót. Í leiknum er **enginn texti**. Í staðinn sýna hreyfingar, hönd og hljóð hvað á að gera.

**Spila:** _(setja inn slóð á GitHub Pages hér)_

---

## Hvernig er spilað?

1. **Haltu fingri á bita.** Hringur fyllist í kringum fingurinn og eftir augnablik lyftist bitinn: hann stækkar og fær skugga.
2. **Dragðu bitann í rétta mótið.** Ef hann er nógu nálægt smellur hann á sinn stað, stjörnur skjótast út og sólin brosir.
   - Rangt mót: bitinn hristist og fer aftur á sinn stað, og rétta mótið glóir.
3. **Sumir bitar snúa vitlaust**, til dæmis hjarta á hvolfi og kind á bakinu. Haltu á bitanum með einum fingri
   og **snúðu honum með öðrum fingri**. Bitinn smellur í næstu 90° stöðu þegar seinni fingrinum er lyft.
4. Þegar öll mót eru full koma konfetti, skýið breytist í hjarta og býfluga flýgur hring.
   Þá birtist ör: **strjúktu til hliðar** til að fara á næsta borð.
5. **Foreldralás** (efst til vinstri): haldið inni í **2 sekúndur** til að byrja borðið upp á nýtt.

Borðin eru þrjú: form (hringur, ferningur, þríhyrningur), form sem þarf að snúa (stjarna, hjarta, hús)
og dýr (fiskur, önd, svín, kind). Eftir síðasta borðið byrjar leikurinn aftur á fyrsta borði.

Ef barnið gerir ekkert í nokkrar sekúndur birtist hönd sem sýnir hvað á að gera.

> Á tölvu án snertiskjás virkar músin líka (Pointer Events). Þá má snúa bitum með **músarhjólinu**.

---

## Uppbygging

```
index.html            SVG-sviðið: lög (layers), sól, ský, lás, hönd, býfluga o.fl.
css/style.css         Uppsetning fyrir síma/spjaldtölvur (touch-action, safe-area, 100dvh)
js/main.js            Leikurinn: layout, borð, leikreglur, Timelines
js/input.js           Pointer Events: long press, pan, multi-touch snúningur, swipe, lás
js/fx.js              Allar anime.js hreyfingar (animate, timeline, draw, morph, motion path)
js/levels.js          Form púslbitanna (SVG path) og borðin
js/sound.js           Einföld hljóð með Web Audio API (engar hljóðskrár)
lib/anime.esm.min.js  anime.js v4.5.0 (ES module)
img/icon.svg          Tákn fyrir heimaskjá
```

---

## Hvernig kröfurnar eru uppfylltar

### 1. SVG og umgjörð
- **Allt** er SVG. Ekkert `<canvas>` er notað og engar myndaskrár eru í leiknum sjálfum. Bitar og mót eru búin til í JS
  (`createPiece()` og `createHole()` í `main.js`) út frá `path`-gögnum í `levels.js`.
- DOM-ið er skipt í lög með `id`: `#layer-bg`, `#layer-board`, `#holes`, `#layer-pieces`, `#layer-fx` o.s.frv.
  Hver biti er `<g class="piece">` með sér `<g class="piece-shadow">` og `<g class="piece-body" data-piece="...">`.
- **Síma- og spjaldtölvuvænt:** `viewBox` er reiknað upp á nýtt eftir skjástærð (`layout()`), þannig að styttri hliðin er alltaf 1000 einingar.
  Á hlið er borðið vinstra megin og bitarnir hægra megin. Upprétt er borðið efst og bitarnir neðst.
  `ResizeObserver` endurraðar öllu þegar síma er snúið. Einnig eru notuð `viewport-fit=cover`, `env(safe-area-inset-*)`,
  `100dvh` og `user-scalable=no`, og hægt er að setja leikinn á heimaskjá (`manifest.webmanifest`).
- Snertiflötur bitanna er stækkaður með ósýnilegum hring, því litlir fingur eru ónákvæmir.

### 2. Kvikun með anime.js v4.5
| Krafa | Hvar |
|---|---|
| **Animation** (`animate`) | Út um allt, til dæmis `tweenPiece()` í `main.js` (anime kvikar `state`-hlut bitans og `render()` skrifar í SVG), `touchDot()`, `releaseRings()`, `sparkle()` og `confetti()` í `fx.js` |
| **Timeline** (`createTimeline`) | `intro()`: útlínur teiknast, mótin dökkna og bitarnir skoppa inn. `levelComplete()`: fögnuður. `placePiece()`: smella á sinn stað. `playHint()`: höndin sýnir hvað á að gera. `rotateHint()`, `lockOpen()` og `sunMood()` |
| **Line drawing** (`svg.createDrawable`) | Útlínur mótanna teiknast upp í byrjun hvers borðs, glóandi útlína sýnir rétt mót í vísbendingum, hringurinn fyllist við long press og á lásnum, og örin í snúningsvísbendingunni teiknast |
| **Morphing** (`svg.morphTo`) | Munnur sólarinnar breytist: bros → „O“ (rangt) → stórt bros (rétt). Skýið breytist í hjarta þegar borð klárast |
| **Follow motion path** (`svg.createMotionPath`) | Býflugan flýgur eftir ferli með lykkju (`#bee-path`) þegar borð klárast. Höndin og gegnsætt afrit af bitanum fylgja bogadregnum ferli (`#hint-path`) að mótinu í vísbendingunni |

Kvikun sýnir líka hvað fingurinn er að gera:
- **Snerting:** lítill hringur birtist undir fingrinum (`touchDot`).
- **Haldið inni:** hringur fyllist í kringum fingurinn (`pressRing`). Þegar hann er fullur „springur“ hann út og bitinn lyftist.
- **Fingri lyft:** tveir hringir breiðast út (`releaseRings`) og bitinn dettur niður með skoppi.

### 3. Pointer Events (`js/input.js`)
Touch Events eru ekki notuð. Allir virkir fingur eru geymdir í `Map` lyklað á `pointerId`,
og `setPointerCapture()` tryggir að fingurinn tapist ekki þótt hann fari út fyrir bitann. `pointercancel` er líka höndlað.

| Krafa | Útfærsla |
|---|---|
| **Multi-touch** | (a) Einn fingur heldur á bita og **annar fingur snýr honum**: hornið á milli fingranna tveggja ræður snúningnum (`attachRotation()` og `updateRotation()`). (b) Hægt er að draga **marga bita samtímis**, hvern með sínum fingri |
| **Time-based gesture** | (a) **Long press 300 ms** á bita áður en hann má hreyfast (`PRESS_MS`). Ef fingurinn hreyfist of snemma er hætt við og bitinn vaggar. (b) **Foreldralás: halda inni í 2 sek** (`LOCK_MS`) til að byrja borðið upp á nýtt |
| **Pan** | Bitinn fylgir fingrinum (`onDrag`) og smellur í mótið þegar honum er sleppt nógu nálægt (`onDrop` → `placePiece`) |
| **Swipe** | Þegar borðið er klárað er strokið til hliðar (> 90 px á < 0,9 sek) og borðið rennur út en nýtt rennur inn (`onSwipe` → `nextLevel`) |

CSS-ið `touch-action: none` kemur í veg fyrir að vafrinn skruni eða þysji og sendi `pointercancel`.
`contextmenu` er bannað svo long press opni ekki valmynd á iOS og Android.

---

## Keyrsla

Leikurinn notar **ES modules** og þarf því að keyra á vefþjóni. Það virkar ekki að tvísmella á `index.html`.

- **VS Code:** „Live Server“ viðbótin → *Open with Live Server*
- **eða í skipanalínu:** `python -m http.server` í möppunni og opna svo `http://localhost:8000`
- **GitHub Pages:** *Settings → Pages → Deploy from a branch → main / (root)*

Til að prófa snertingu á tölvu má nota *Device Toolbar* í Chrome DevTools. Best er samt að prófa á alvöru spjaldtölvu eða síma.

Í console má skoða ástand leiksins með `game` (til dæmis `game.mode` og `game.pieces`).

---

## Heimildir
- [anime.js v4](https://animejs.com/documentation/) – Julian Garnier (MIT leyfi)
- [MDN: Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- Öll SVG-grafík (form, dýr, sól, býfluga, hönd) er teiknuð í kóða fyrir þetta verkefni.
