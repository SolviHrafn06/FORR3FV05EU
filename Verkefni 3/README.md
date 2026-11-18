# Dularfulla herbergið – Star Wars

Lítill 3D leikur í Three.js (r187) í tveimur hlutum:

1. **Flugskýlið (herbergið):** B1 battle droidar standa vakt í röðum, R2-D2 rúllar á eftir Anakin og geislasverðið lýsir upp myrkrið. Anakin gengur að skipinu sínu og fer um borð. Það tekur á loft og flýgur út um opið á flugskýlinu.
2. **Geimurinn:** frjálst flug innan um loftsteina við plánetu. Bylgjur af TIE orrustuflaugum elta skipið og skjóta. Eyddu öllum 5 bylgjunum til að vinna.

Herbergið er „Dularfulla herbergið“ í Star Wars búningi: næstum tómt, súlur, þoka (`FogExp2`), ljósgjafi í hendi karaktersins og furðuleg vera í horninu sem snýr sér að honum með `.lookAt()`.

spila á [github pages](https://solvihrafn06.github.io/FORR3FV05EU/Verkefni%203/)

## Stýring

| | Tölva | Sími / spjaldtölva |
| --- | --- | --- |
| **Flugskýlið** | **WASD / örvar** ganga, **Shift** hlaupa, **smellur** ganga þangað, **bil** höggva, **F** sverð á/af, **E** fara um borð | pikka á gólfið, **Sveifla**, **Sverð**, **Fara um borð** |
| **Geimurinn** | **mús** eða **WASD / örvar** stýra, **smellur / bil** skjóta, **Shift** hraði | **draga fingur** til að stýra, **Skjóta**, **Hraði** (haldið inni) |

Í geimnum sýna **rauð merki** hvar TIE flaugarnar eru (örvar við jaðarinn ef þær eru ekki á skjánum). Byssurnar miða aðeins sjálfar ef TIE er nálægt miðinu.

## Áður en þú skilar

1. Sjá [models/OSKALISTI.md](models/OSKALISTI.md) yfir módel sem gera leikinn flottari. Ef þú finnur módel af skipi og TIE flaug: settu þau í `models/skip.glb` og `models/tie.glb` (sjá [models/LESTU-MIG.md](models/LESTU-MIG.md)). Annars eru notuð einföld líkön úr grunnformum.
2. Ljósmyndaðu hlut, breyttu myndinni í .glb með gervigreindartóli og settu hann í `models/minn-hlutur.glb`.
   Breyttu svo `MINN_HLUTUR_HAED` efst í `js/main.js` í raunverulega hæð hans í metrum.
3. Settu ljósmyndina af hlutnum í Canvas ásamt öllum skránum.

## Skrár

```
Verkefni 3/
  index.html            hleðsluskjár, líf/stig, leikslok, stjórnborð og import map fyrir CDN
  css/style.css
  js/main.js            allur leikurinn
  js/hreyfiklippur.js   hreyfingar sverðshandarinnar, fingra og byssuhanda B1
  js/geimur.js          geimhlutinn: geimsenan, flugið, TIE flaugar, skot og sprengingar
  hreyfingar/           hreyfingar.json: mocap ganga, hlaup og kyrrstaða, flutt yfir á Anakin og B1
  models/               módelin (sjá models/LESTU-MIG.md)
  aferdir/              golf.png og veggur.png (TextureLoader)
  hljod/                13 hljóð (AudioLoader)
  verkfaeri/            python skrifta (hljóð og áferðir) og flytja-hreyfingar.html (mocap → Anakin/B1)
  UTSKYRINGAR.md        útskýringar á öllum kóðanum
```

Three.js 0.187.0 og Anime.js 4.5.0 (með Three.js adapter) eru sótt af CDN (jsdelivr), engin söfn eru á GitHub.

## Hvaðan kemur efnið

Öll módelin eru af [Sketchfab](https://sketchfab.com) með CC-BY-4.0 leyfi, sem krefst þess að höfundar séu nefndir:

- **Anakin Skywalker (Battlefront II)** eftir rendysix
- **Anakin Lightsaber** eftir Khafesys
- **B1 Battle Droid** eftir leoxx300
- **Millennium Falcon** eftir fredbear1211
- **Star Wars Logo** eftir David Tena C.
- **Star Wars R2-D2** eftir tegnemaskin
- **Hreyfingar (idle, walk, run):** af Xbot módelinu í dæmum [three.js](https://github.com/mrdoob/three.js) (hreyfiföngun frá Mixamo), fluttar yfir á Anakin og B1 með `verkfaeri/flytja-hreyfingar.html`
- **Minn hlutur:** *(hvaða hlut þú ljósmyndaðir og hvaða gervigreindartól breytti myndinni í .glb)*
- **Hljóð og áferðir:** búin til í kóða með `verkfaeri/bua_til_hljod_og_aferdir.py` (sínusbylgjur og suð með numpy), ekkert sótt af netinu.

## AI notkun

Claude (gervigreind) hjálpaði við að setja upp senuna, skrifa kóðann, flytja mocap hreyfingarnar yfir á beinagrindurnar og búa til hljóðin og áferðirnar.
