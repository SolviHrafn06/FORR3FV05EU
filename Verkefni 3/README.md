# Dularfulla herbergið – Star Wars

Lítið gagnvirkt 3D herbergi í Three.js (r187). Anakin Skywalker gengur um dimmt herbergi í geimstöð með geislasverð sem lýsir upp myrkrið.
Í horninu svífur könnunar-droid sem snýr sér alltaf að honum, ljósin í loftinu flökta og hurðin opnast þegar hann nálgast hana.

Þemað er „Dularfulla herbergið“ í Star Wars búningi: næstum tómt herbergi, þrjár súlur, þoka (`FogExp2`), ljósgjafi í hendi karaktersins og furðuleg vera í horninu sem snýr sér að honum með `.lookAt()`.

spila á [github pages](https://solvihrafn06.github.io/FORR3FV05EU/Verkefni%203/)

## Stýring

| Tölva | Sími / spjaldtölva |
| --- | --- |
| **WASD** eða **örvar**: ganga | pikkaðu á gólfið til að ganga þangað |
| **Shift**: hlaupa | **Sveifla** takkinn |
| **smellur á gólfið**: ganga þangað | **Sverð** takkinn |
| **Bil**: sveifla sverðinu | |
| **F**: kveikja / slökkva á sverðinu | |

## Áður en þú skilar

1. Settu `anakin.glb` í `models/` (sjá [models/LESTU-MIG.md](models/LESTU-MIG.md)).
2. Settu skannaða hlutinn í `models/minn-hlutur.glb` og breyttu `MINN_HLUTUR_HAED` efst í `js/main.js` í raunverulega hæð hans í metrum.
3. Opnaðu Console (F12) og athugaðu hvað stendur í `Hreyfingar í anakin.glb: [...]`. Ef hann gengur afturábak, breyttu `ANAKIN_SNUNINGUR` í `Math.PI`.
4. Settu ljósmyndina af hlutnum í Canvas ásamt öllum skránum.

## Skrár

```
Verkefni 3/
  index.html            hleðsluskjár, stjórnborð og import map fyrir CDN
  css/style.css
  js/main.js            allur leikurinn
  models/               anakin.glb og minn-hlutur.glb
  aferdir/              golf.png og veggur.png (TextureLoader)
  hljod/                6 hljóð (AudioLoader)
  verkfaeri/            python skrifta sem bjó til hljóðin og áferðirnar
  UTSKYRINGAR.md        útskýringar á öllum kóðanum
```

Three.js 0.187.0 og Anime.js 4.5.0 (með Three.js adapter) eru sótt af CDN (jsdelivr), engin söfn eru á GitHub.

## Hvaðan kemur efnið

- **Anakin módel:** *(skrifaðu hér hvaðan módelið kemur og hver gerði það, t.d. Sketchfab hlekkur og leyfi)*
- **Minn hlutur:** *(hvaða hlut þú ljósmyndaðir og hvaða gervigreindartól breytti myndinni í .glb)*
- **Hljóð og áferðir:** búin til í kóða með `verkfaeri/bua_til_hljod_og_aferdir.py` (sínusbylgjur og suð með numpy), ekkert sótt af netinu.

## AI notkun

Claude (gervigreind) hjálpaði við að setja upp senuna, skrifa kóðann og búa til hljóðin og áferðirnar.
